import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  BookOpen, 
  Clock, 
  CheckCircle, 
  MessageSquare, 
  Calendar,
  User,
  Play,
  FileText,
  Award,
  GraduationCap,
  Search
} from "lucide-react";

interface Course {
  id: string;
  title: string;
  instructor: string;
  progress: number;
  nextClass: string;
  status: 'active' | 'completed' | 'upcoming';
}

interface Assignment {
  id: string;
  title: string;
  course: string;
  dueDate: string;
  status: 'pending' | 'submitted' | 'graded';
  grade?: number;
}

interface StudentDashboardProps {
  onLogout: () => void;
  user: any;
  profile: any;
}

export function StudentDashboard({ onLogout, user, profile }: StudentDashboardProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [availableCourses, setAvailableCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load enrolled courses with instructor info
      const { data: enrolledCoursesData, error: enrolledError } = await supabase
        .from('enrollments')
        .select(`
          *,
          courses (
            id,
            title,
            description,
            instructor_id
          )
        `)
        .eq('student_id', user.id);

      if (enrolledError) throw enrolledError;

      // Get instructor names separately
      const instructorIds = enrolledCoursesData?.map(e => e.courses?.instructor_id).filter(Boolean) || [];
      let instructorMap: { [key: string]: string } = {};
      
      if (instructorIds.length > 0) {
        const { data: instructorsData } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', instructorIds);
        
        instructorMap = instructorsData?.reduce((acc, instructor) => {
          acc[instructor.user_id] = instructor.full_name;
          return acc;
        }, {} as { [key: string]: string }) || {};
      }

      const coursesWithDetails: Course[] = enrolledCoursesData?.map(enrollment => ({
        id: enrollment.courses?.id || '',
        title: enrollment.courses?.title || '',
        instructor: instructorMap[enrollment.courses?.instructor_id || ''] || 'Unknown',
        progress: enrollment.progress || 0,
        nextClass: 'Schedule TBD',
        status: (enrollment.progress === 100 ? 'completed' : 'active') as 'active' | 'completed' | 'upcoming'
      })) || [];

      setCourses(coursesWithDetails);

      // Load assignments for enrolled courses
      const courseIds = coursesWithDetails.map(c => c.id);
      if (courseIds.length > 0) {
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from('assignments')
          .select(`
            *,
            courses (title),
            assignment_submissions (grade, submitted_at, graded_at)
          `)
          .in('course_id', courseIds)
          .order('due_date', { ascending: true });

        if (assignmentsError) throw assignmentsError;

        const assignmentsWithStatus = assignmentsData?.map(assignment => {
          const submission = assignment.assignment_submissions?.[0];
          let status: 'pending' | 'submitted' | 'graded' = 'pending';
          
          if (submission) {
            status = submission.graded_at ? 'graded' : 'submitted';
          }

          return {
            id: assignment.id,
            title: assignment.title,
            course: assignment.courses.title,
            dueDate: new Date(assignment.due_date).toLocaleDateString(),
            status,
            grade: submission?.grade
          };
        }) || [];

        setAssignments(assignmentsWithStatus);
      }

      // Load available courses for browsing
      const { data: allCoursesData, error: allCoursesError } = await supabase
        .from('courses')
        .select('*')
        .not('id', 'in', `(${courseIds.join(',') || 'null'})`);

      if (allCoursesError) throw allCoursesError;
      setAvailableCourses(allCoursesData || []);

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

  const enrollInCourse = async (courseId: string) => {
    try {
      const { error } = await supabase
        .from('enrollments')
        .insert([
          {
            student_id: user.id,
            course_id: courseId,
            progress: 0
          }
        ]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Successfully enrolled in course!",
      });

      // Refresh data
      loadDashboardData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-primary';
      case 'completed': return 'bg-secondary';
      case 'upcoming': return 'bg-accent';
      case 'pending': return 'bg-accent';
      case 'submitted': return 'bg-primary';
      case 'graded': return 'bg-secondary';
      default: return 'bg-muted';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'graded':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      default:
        return <Play className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white shadow-card border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-3">
              <User className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Student Dashboard - {profile?.full_name}</h1>
            </div>
            <Button variant="outline" onClick={onLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-card shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <BookOpen className="h-10 w-10 text-primary" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{courses.length}</p>
                  <p className="text-muted-foreground">Enrolled Courses</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <FileText className="h-10 w-10 text-accent" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{assignments.length}</p>
                  <p className="text-muted-foreground">Assignments</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Award className="h-10 w-10 text-secondary" />
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {Math.round(courses.reduce((sum, course) => sum + course.progress, 0) / courses.length) || 0}%
                  </p>
                  <p className="text-muted-foreground">Avg Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <MessageSquare className="h-10 w-10 text-primary" />
                <div>
                  <p className="text-2xl font-bold text-foreground">3</p>
                  <p className="text-muted-foreground">New Messages</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="courses" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="courses" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              My Courses
            </TabsTrigger>
            <TabsTrigger value="assignments" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Assignments
            </TabsTrigger>
            <TabsTrigger value="browse" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Browse Courses
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="grades" className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Grades
            </TabsTrigger>
          </TabsList>

          {/* My Courses Tab */}
          <TabsContent value="courses" className="space-y-6">
            <h2 className="text-xl font-semibold text-foreground">My Courses</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {courses.map((course) => (
                <Card key={course.id} className="bg-gradient-card shadow-card hover:shadow-elegant transition-all duration-300">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg text-foreground">{course.title}</CardTitle>
                      <Badge className={getStatusColor(course.status)}>
                        {getStatusIcon(course.status)}
                        <span className="ml-1 capitalize">{course.status}</span>
                      </Badge>
                    </div>
                    <CardDescription>Instructor: {course.instructor}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="text-foreground font-medium">{course.progress}%</span>
                        </div>
                        <Progress value={course.progress} className="h-2" />
                      </div>
                      
                      {course.status !== 'completed' && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          Next class: {course.nextClass}
                        </div>
                      )}
                      
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" variant="default" className="flex-1">
                          Continue Learning
                        </Button>
                        <Button size="sm" variant="outline">
                          Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {courses.length === 0 && (
                <Card className="bg-gradient-card shadow-card col-span-full">
                  <CardContent className="p-6">
                    <div className="text-center py-8">
                      <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">No courses enrolled yet</h3>
                      <p className="text-muted-foreground mb-4">Browse available courses to get started</p>
                      <Button variant="student">Browse Courses</Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Assignments Tab */}
          <TabsContent value="assignments" className="space-y-6">
            <h2 className="text-xl font-semibold text-foreground">My Assignments</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {assignments.map((assignment) => (
                <Card key={assignment.id} className="bg-gradient-card shadow-card hover:shadow-elegant transition-all duration-300">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg text-foreground">{assignment.title}</CardTitle>
                      <Badge className={getStatusColor(assignment.status)}>
                        {getStatusIcon(assignment.status)}
                        <span className="ml-1 capitalize">{assignment.status}</span>
                      </Badge>
                    </div>
                    <CardDescription>{assignment.course}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Due: {assignment.dueDate}
                      </div>
                      {assignment.grade && (
                        <div className="text-lg font-bold text-secondary">
                          {assignment.grade}%
                        </div>
                      )}
                    </div>
                    {assignment.status === 'pending' && (
                      <Button size="sm" variant="default" className="w-full mt-3">
                        Start Assignment
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
              
              {assignments.length === 0 && (
                <Card className="bg-gradient-card shadow-card col-span-full">
                  <CardContent className="p-6">
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">No assignments yet</h3>
                      <p className="text-muted-foreground">Assignments will appear here once you enroll in courses</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Browse Courses Tab */}
          <TabsContent value="browse" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-foreground">Available Courses</h2>
              <Badge variant="outline">{availableCourses.length} courses available</Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableCourses.map((course) => (
                <Card key={course.id} className="bg-gradient-card shadow-card hover:shadow-elegant transition-all duration-300 transform hover:scale-105">
                  <CardHeader>
                    <CardTitle className="text-foreground">{course.title}</CardTitle>
                    <CardDescription>{course.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Created {new Date(course.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="student" 
                      className="w-full"
                      onClick={() => enrollInCourse(course.id)}
                    >
                      Enroll Now
                    </Button>
                  </CardContent>
                </Card>
              ))}
              
              {availableCourses.length === 0 && (
                <Card className="bg-gradient-card shadow-card col-span-full">
                  <CardContent className="p-6">
                    <div className="text-center py-8">
                      <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">No new courses available</h3>
                      <p className="text-muted-foreground">You're enrolled in all available courses!</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages" className="space-y-6">
            <h2 className="text-xl font-semibold text-foreground">Messages</h2>
            
            <Card className="bg-gradient-card shadow-card">
              <CardContent className="p-6">
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">Message Center</h3>
                  <p className="text-muted-foreground mb-4">Communicate with your instructors and classmates</p>
                  <Button variant="student">Open Chat</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Grades Tab */}
          <TabsContent value="grades" className="space-y-6">
            <h2 className="text-xl font-semibold text-foreground">My Grades</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {assignments.filter(a => a.grade).map((assignment) => (
                <Card key={assignment.id} className="bg-gradient-card shadow-card">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg text-foreground">{assignment.title}</CardTitle>
                      <div className="text-2xl font-bold text-secondary">
                        {assignment.grade}%
                      </div>
                    </div>
                    <CardDescription>{assignment.course}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      Submitted: {assignment.dueDate}
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {assignments.filter(a => a.grade).length === 0 && (
                <Card className="bg-gradient-card shadow-card col-span-full">
                  <CardContent className="p-6">
                    <div className="text-center py-8">
                      <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">No grades yet</h3>
                      <p className="text-muted-foreground">Complete assignments to see your grades here</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}