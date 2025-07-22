import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  FileText,
  BarChart3,
  Settings,
  CheckCircle
} from "lucide-react";

interface Course {
  id: string;
  title: string;
  description: string;
  students: number;
  createdAt: string;
}

interface Student {
  id: string;
  full_name: string;
  email: string;
  enrolled_at?: string;
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
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [enrolledStudents, setEnrolledStudents] = useState<Student[]>([]);
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [newCourse, setNewCourse] = useState({
    title: '',
    description: ''
  });
  const [newAssignment, setNewAssignment] = useState({
    title: '',
    description: '',
    dueDate: '',
    courseId: ''
  });
  const [courseDetails, setCourseDetails] = useState<Course | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreateAssignmentOpen, setIsCreateAssignmentOpen] = useState(false);
  const [isEnrollDialogOpen, setIsEnrollDialogOpen] = useState(false);
  const [isCourseDetailsOpen, setIsCourseDetailsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      loadCourseStudents(selectedCourse);
    }
  }, [selectedCourse]);

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

  const loadCourseStudents = async (courseId: string) => {
    try {
      // Load enrolled students for the course
      const { data: enrolledData, error: enrolledError } = await supabase
        .from('enrollments')
        .select('enrolled_at, student_id')
        .eq('course_id', courseId);

      if (enrolledError) throw enrolledError;

      // Get student profiles
      const studentIds = enrolledData?.map(e => e.student_id) || [];
      let enrolledStudentProfiles: any[] = [];
      
      if (studentIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', studentIds);

        if (profilesError) throw profilesError;
        enrolledStudentProfiles = profilesData || [];
      }

      // Combine enrollment data with profiles
      const enrolled: Student[] = enrolledData?.map(enrollment => {
        const profile = enrolledStudentProfiles.find(p => p.user_id === enrollment.student_id);
        const fullName = profile?.full_name || 'Unknown';
        return {
          id: enrollment.student_id,
          full_name: fullName,
          email: `${fullName.toLowerCase().replace(/\s+/g, '.')}@student.com`,
          enrolled_at: enrollment.enrolled_at
        };
      }) || [];

      setEnrolledStudents(enrolled);

      // Load available students (not enrolled in this course)
      let allStudentsQuery = supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('role', 'student');

      if (studentIds.length > 0) {
        allStudentsQuery = allStudentsQuery.not('user_id', 'in', `(${studentIds.join(',')})`);
      }

      const { data: allStudentsData, error: allStudentsError } = await allStudentsQuery;

      if (allStudentsError) throw allStudentsError;

      const available: Student[] = allStudentsData?.map(student => ({
        id: student.user_id,
        full_name: student.full_name,
        email: `${student.full_name?.toLowerCase().replace(/\s+/g, '.')}@student.com` || 'unknown@student.com'
      })) || [];

      setAvailableStudents(available);

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const enrollStudent = async (studentId: string, courseId: string) => {
    try {
      const { error } = await supabase
        .from('enrollments')
        .insert([
          {
            student_id: studentId,
            course_id: courseId,
            progress: 0
          }
        ]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Student enrolled successfully!",
      });

      // Refresh course students
      loadCourseStudents(courseId);
      // Refresh dashboard data to update counts
      loadDashboardData();

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openEnrollDialog = (courseId: string) => {
    setSelectedCourse(courseId);
    setIsEnrollDialogOpen(true);
  };

  const createAssignment = async () => {
    if (!newAssignment.title || !newAssignment.description || !newAssignment.courseId) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('assignments')
        .insert([
          {
            title: newAssignment.title,
            description: newAssignment.description,
            course_id: newAssignment.courseId,
            due_date: newAssignment.dueDate ? new Date(newAssignment.dueDate).toISOString() : null
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setNewAssignment({ title: '', description: '', dueDate: '', courseId: '' });
      setIsCreateAssignmentOpen(false);
      setTotalAssignments(prev => prev + 1);

      toast({
        title: "Success",
        description: "Assignment created successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openCourseDetails = (course: Course) => {
    setCourseDetails(course);
    setIsCourseDetailsOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white shadow-card border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-3">
              <PenTool className="h-8 w-8 text-secondary" />
              <h1 className="text-2xl font-bold text-foreground">Teacher Dashboard - {profile?.full_name}</h1>
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

        {/* Main Tabs */}
        <Tabs defaultValue="courses" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="courses" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Courses
            </TabsTrigger>
            <TabsTrigger value="assignments" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Assignments
            </TabsTrigger>
            <TabsTrigger value="students" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Students
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Courses Tab */}
          <TabsContent value="courses" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-foreground">Your Courses</h2>
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
            </div>
            
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
                      <Button 
                        size="sm" 
                        variant="default" 
                        className="flex-1"
                        onClick={() => openEnrollDialog(course.id)}
                      >
                        Manage Students
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => openCourseDetails(course)}
                      >
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Enrollment Management Dialog */}
            <Dialog open={isEnrollDialogOpen} onOpenChange={setIsEnrollDialogOpen}>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Manage Course Enrollment</DialogTitle>
                  <DialogDescription>
                    View enrolled students and add new ones to the course.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Enrolled Students */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Enrolled Students ({enrolledStudents.length})</h3>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {enrolledStudents.map((student) => (
                        <Card key={student.id} className="bg-gradient-card">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-foreground">{student.full_name}</p>
                                <p className="text-sm text-muted-foreground">{student.email}</p>
                                {student.enrolled_at && (
                                  <p className="text-xs text-muted-foreground">
                                    Enrolled: {new Date(student.enrolled_at).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                              <Badge variant="secondary">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Enrolled
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      
                      {enrolledStudents.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <Users className="h-8 w-8 mx-auto mb-2" />
                          <p>No students enrolled yet</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Available Students */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Available Students ({availableStudents.length})</h3>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {availableStudents.map((student) => (
                        <Card key={student.id} className="bg-gradient-card">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-foreground">{student.full_name}</p>
                                <p className="text-sm text-muted-foreground">{student.email}</p>
                              </div>
                              <Button
                                size="sm"
                                variant="teacher"
                                onClick={() => selectedCourse && enrollStudent(student.id, selectedCourse)}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Enroll
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      
                      {availableStudents.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                          <p>All students are enrolled!</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Course Details Dialog */}
            <Dialog open={isCourseDetailsOpen} onOpenChange={setIsCourseDetailsOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{courseDetails?.title}</DialogTitle>
                  <DialogDescription>Course Information and Statistics</DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Description</h3>
                    <p className="text-muted-foreground">{courseDetails?.description}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="bg-gradient-card">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <Users className="h-8 w-8 text-secondary" />
                          <div>
                            <p className="text-2xl font-bold text-foreground">{courseDetails?.students}</p>
                            <p className="text-sm text-muted-foreground">Enrolled Students</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-gradient-card">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <Calendar className="h-8 w-8 text-primary" />
                          <div>
                            <p className="text-lg font-bold text-foreground">{courseDetails?.createdAt}</p>
                            <p className="text-sm text-muted-foreground">Created</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="teacher" 
                      className="flex-1"
                      onClick={() => {
                        if (courseDetails) {
                          openEnrollDialog(courseDetails.id);
                          setIsCourseDetailsOpen(false);
                        }
                      }}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Manage Students
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Message Students
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Assignments Tab */}
          <TabsContent value="assignments" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-foreground">Assignments</h2>
              <Dialog open={isCreateAssignmentOpen} onOpenChange={setIsCreateAssignmentOpen}>
                <DialogTrigger asChild>
                  <Button variant="teacher" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Create Assignment
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Assignment</DialogTitle>
                    <DialogDescription>
                      Create an assignment for one of your courses.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="assignmentTitle">Assignment Title</Label>
                      <Input
                        id="assignmentTitle"
                        value={newAssignment.title}
                        onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                        placeholder="Enter assignment title"
                      />
                    </div>
                    <div>
                      <Label htmlFor="assignmentDescription">Description</Label>
                      <Textarea
                        id="assignmentDescription"
                        value={newAssignment.description}
                        onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
                        placeholder="Enter assignment description"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="courseSelect">Course</Label>
                      <select
                        id="courseSelect"
                        value={newAssignment.courseId}
                        onChange={(e) => setNewAssignment({ ...newAssignment, courseId: e.target.value })}
                        className="w-full p-2 border rounded-md bg-background"
                      >
                        <option value="">Select a course</option>
                        {courses.map((course) => (
                          <option key={course.id} value={course.id}>
                            {course.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="dueDate">Due Date (Optional)</Label>
                      <Input
                        id="dueDate"
                        type="datetime-local"
                        value={newAssignment.dueDate}
                        onChange={(e) => setNewAssignment({ ...newAssignment, dueDate: e.target.value })}
                      />
                    </div>
                    <Button onClick={createAssignment} className="w-full">
                      Create Assignment
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            <Card className="bg-gradient-card shadow-card">
              <CardContent className="p-6">
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No assignments yet</h3>
                  <p className="text-muted-foreground mb-4">Create your first assignment to get started</p>
                  <Button 
                    variant="teacher"
                    onClick={() => setIsCreateAssignmentOpen(true)}
                  >
                    Create Assignment
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students" className="space-y-6">
            <h2 className="text-xl font-semibold text-foreground">Student Management</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <Card key={course.id} className="bg-gradient-card shadow-card">
                  <CardHeader>
                    <CardTitle className="text-foreground">{course.title}</CardTitle>
                    <CardDescription>
                      {course.students} student{course.students !== 1 ? 's' : ''} enrolled
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      variant="teacher" 
                      className="w-full"
                      onClick={() => openEnrollDialog(course.id)}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Manage Enrollment
                    </Button>
                  </CardContent>
                </Card>
              ))}
              
              {courses.length === 0 && (
                <Card className="bg-gradient-card shadow-card col-span-full">
                  <CardContent className="p-6">
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">No courses created yet</h3>
                      <p className="text-muted-foreground">Create a course first to manage student enrollments</p>
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
                  <p className="text-muted-foreground mb-4">Communicate with your students</p>
                  <Button 
                    variant="teacher"
                    onClick={() => toast({
                      title: "Chat Feature",
                      description: "Chat functionality will be available soon!",
                    })}
                  >
                    Open Chat
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <h2 className="text-xl font-semibold text-foreground">Analytics</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-gradient-card shadow-card">
                <CardHeader>
                  <CardTitle>Course Performance</CardTitle>
                  <CardDescription>Track how your courses are performing</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-4">
                    <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Analytics coming soon</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-card shadow-card">
                <CardHeader>
                  <CardTitle>Student Engagement</CardTitle>
                  <CardDescription>See how engaged your students are</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-4">
                    <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Engagement metrics coming soon</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}