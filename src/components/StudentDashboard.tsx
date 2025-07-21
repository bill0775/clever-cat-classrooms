import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  BookOpen, 
  Clock, 
  CheckCircle, 
  MessageSquare, 
  Calendar,
  User,
  Play,
  FileText,
  Award
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
}

export function StudentDashboard({ onLogout }: StudentDashboardProps) {
  const [courses] = useState<Course[]>([
    {
      id: '1',
      title: 'Introduction to React',
      instructor: 'Dr. Smith',
      progress: 75,
      nextClass: '2024-01-20 10:00 AM',
      status: 'active'
    },
    {
      id: '2',
      title: 'Advanced JavaScript',
      instructor: 'Prof. Johnson',
      progress: 45,
      nextClass: '2024-01-21 2:00 PM',
      status: 'active'
    },
    {
      id: '3',
      title: 'Web Design Principles',
      instructor: 'Ms. Davis',
      progress: 100,
      nextClass: 'Completed',
      status: 'completed'
    }
  ]);

  const [assignments] = useState<Assignment[]>([
    {
      id: '1',
      title: 'React Components Exercise',
      course: 'Introduction to React',
      dueDate: '2024-01-25',
      status: 'pending'
    },
    {
      id: '2',
      title: 'JavaScript Functions Quiz',
      course: 'Advanced JavaScript',
      dueDate: '2024-01-22',
      status: 'submitted'
    },
    {
      id: '3',
      title: 'Design Portfolio',
      course: 'Web Design Principles',
      dueDate: '2024-01-15',
      status: 'graded',
      grade: 92
    }
  ]);

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
              <h1 className="text-2xl font-bold text-foreground">Student Dashboard</h1>
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
                    {Math.round(courses.reduce((sum, course) => sum + course.progress, 0) / courses.length)}%
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

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <Button variant="student" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Browse Courses
            </Button>

            <Button variant="outline" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              View Schedule
            </Button>

            <Button variant="outline" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Open Chat
            </Button>

            <Button variant="outline" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Submit Assignment
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Courses */}
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4">My Courses</h2>
            <div className="space-y-4">
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
            </div>
          </div>

          {/* Assignments */}
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4">Recent Assignments</h2>
            <div className="space-y-4">
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}