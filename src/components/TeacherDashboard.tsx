import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  BookOpen, 
  Users, 
  PenTool, 
  MessageSquare, 
  Plus, 
  Calendar,
  Clock,
  FileText
} from "lucide-react";

interface Course {
  id: string;
  title: string;
  description: string;
  students: number;
  createdAt: string;
}

interface TeacherDashboardProps {
  onLogout: () => void;
  user: any;
  profile: any;
}

export function TeacherDashboard({ onLogout, user, profile }: TeacherDashboardProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalAssignments, setTotalAssignments] = useState(0);
  const [newCourse, setNewCourse] = useState({
    title: '',
    description: ''
  });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load courses with enrollment counts
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select(`
          *,
          enrollments (count)
        `)
        .eq('instructor_id', user.id)
        .order('created_at', { ascending: false });

      if (coursesError) throw coursesError;

      const coursesWithStudentCounts = coursesData?.map(course => ({
        id: course.id,
        title: course.title,
        description: course.description,
        students: course.enrollments?.[0]?.count || 0,
        createdAt: new Date(course.created_at).toLocaleDateString()
      })) || [];

      setCourses(coursesWithStudentCounts);

      // Calculate total students
      const total = coursesWithStudentCounts.reduce((sum, course) => sum + course.students, 0);
      setTotalStudents(total);

      // Load assignments count
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assignments')
        .select('id, course_id')
        .in('course_id', coursesData?.map(c => c.id) || []);

      if (assignmentsError) throw assignmentsError;
      setTotalAssignments(assignmentsData?.length || 0);

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createCourse = async () => {
    if (!newCourse.title || !newCourse.description) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('courses')
        .insert([
          {
            title: newCourse.title,
            description: newCourse.description,
            instructor_id: user.id
          }
        ])
        .select()
        .single();

      if (error) throw error;

      const newCourseItem: Course = {
        id: data.id,
        title: data.title,
        description: data.description,
        students: 0,
        createdAt: new Date(data.created_at).toLocaleDateString()
      };

      setCourses([newCourseItem, ...courses]);
      setNewCourse({ title: '', description: '' });
      setIsCreateDialogOpen(false);

      toast({
        title: "Success",
        description: "Course created successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white shadow-card border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-3">
              <PenTool className="h-8 w-8 text-secondary" />
              <h1 className="text-2xl font-bold text-foreground">Welcome, {profile?.full_name}</h1>
            </div>
            <Button variant="outline" onClick={onLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-card shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <BookOpen className="h-10 w-10 text-primary" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{courses.length}</p>
                  <p className="text-muted-foreground">Active Courses</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Users className="h-10 w-10 text-secondary" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalStudents}</p>
                  <p className="text-muted-foreground">Total Students</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <FileText className="h-10 w-10 text-accent" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalAssignments}</p>
                  <p className="text-muted-foreground">Assignments</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <MessageSquare className="h-10 w-10 text-primary" />
                <div>
                  <p className="text-2xl font-bold text-foreground">5</p>
                  <p className="text-muted-foreground">Unread Messages</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="teacher" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create Course
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Course</DialogTitle>
                  <DialogDescription>
                    Fill in the details to create a new course for your students.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Course Title</Label>
                    <Input
                      id="title"
                      value={newCourse.title}
                      onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                      placeholder="Enter course title"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newCourse.description}
                      onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                      placeholder="Enter course description"
                      rows={3}
                    />
                  </div>
                  <Button onClick={createCourse} className="w-full">
                    Create Course
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button variant="outline" className="flex items-center gap-2">
              <PenTool className="h-4 w-4" />
              Create Exam
            </Button>

            <Button variant="outline" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Schedule Class
            </Button>

            <Button variant="outline" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Open Chat
            </Button>
          </div>
        </div>

        {/* Courses Grid */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">Your Courses</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <Card key={course.id} className="bg-gradient-card shadow-card hover:shadow-elegant transition-all duration-300 transform hover:scale-105">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-foreground">{course.title}</span>
                    <Badge variant="secondary">{course.students} students</Badge>
                  </CardTitle>
                  <CardDescription>{course.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Created {course.createdAt}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="default" className="flex-1">
                      Manage
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}