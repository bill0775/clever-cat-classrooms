import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { RoleSelection } from "@/components/RoleSelection";
import { TeacherDashboard } from "@/components/TeacherDashboard";
import { StudentDashboard } from "@/components/StudentDashboard";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user profile
          setTimeout(async () => {
            try {
              const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', session.user.id)
                .single();
              
              if (error && error.code !== 'PGRST116') {
                console.error('Error fetching profile:', error);
              } else {
                setUserProfile(profile);
              }
            } catch (err) {
              console.error('Profile fetch error:', err);
            }
            setLoading(false);
          }, 0);
        } else {
          setUserProfile(null);
          setLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/auth');
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-xl font-medium text-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to auth
  if (!user || !session) {
    navigate('/auth');
    return null;
  }

  // If no profile, show role selection temporarily (this shouldn't happen with the trigger)
  if (!userProfile) {
    return <RoleSelection onRoleSelect={() => {}} />;
  }

  // Show appropriate dashboard based on user role
  if (userProfile.role === 'teacher') {
    return <TeacherDashboard onLogout={handleLogout} user={user} profile={userProfile} />;
  }

  return <StudentDashboard onLogout={handleLogout} user={user} profile={userProfile} />;
};

export default Index;
