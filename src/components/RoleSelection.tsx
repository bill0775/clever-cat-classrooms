import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, User, BookOpen, PenTool } from "lucide-react";

interface RoleSelectionProps {
  onRoleSelect: (role: 'teacher' | 'student') => void;
}

export function RoleSelection({ onRoleSelect }: RoleSelectionProps) {
  const [selectedRole, setSelectedRole] = useState<'teacher' | 'student' | null>(null);

  const handleRoleSelect = (role: 'teacher' | 'student') => {
    setSelectedRole(role);
    onRoleSelect(role);
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12 animate-fade-in">
          <GraduationCap className="mx-auto h-16 w-16 text-white mb-6" />
          <h1 className="text-5xl font-bold text-white mb-4">EduPlatform</h1>
          <p className="text-xl text-white/90 mb-8">
            Your gateway to interactive online learning
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 animate-scale-in">
          <Card className="group hover:shadow-glow transition-all duration-300 transform hover:scale-105 bg-gradient-card border-0">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto h-20 w-20 bg-gradient-secondary rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <PenTool className="h-10 w-10 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-foreground">Teacher</CardTitle>
              <CardDescription className="text-lg text-muted-foreground">
                Create courses, manage students, and conduct exams
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-center gap-3">
                  <BookOpen className="h-5 w-5 text-secondary" />
                  Create and manage courses
                </li>
                <li className="flex items-center gap-3">
                  <User className="h-5 w-5 text-secondary" />
                  Track student progress
                </li>
                <li className="flex items-center gap-3">
                  <GraduationCap className="h-5 w-5 text-secondary" />
                  Design custom exams
                </li>
              </ul>
              <Button 
                variant="teacher"
                size="lg"
                className="w-full mt-6"
                onClick={() => handleRoleSelect('teacher')}
              >
                Start Teaching
              </Button>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-glow transition-all duration-300 transform hover:scale-105 bg-gradient-card border-0">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto h-20 w-20 bg-gradient-primary rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <User className="h-10 w-10 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-foreground">Student</CardTitle>
              <CardDescription className="text-lg text-muted-foreground">
                Join classes, learn interactively, and take exams
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-center gap-3">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Access course materials
                </li>
                <li className="flex items-center gap-3">
                  <User className="h-5 w-5 text-primary" />
                  Chat with teachers & peers
                </li>
                <li className="flex items-center gap-3">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  Take interactive exams
                </li>
              </ul>
              <Button 
                variant="student"
                size="lg"
                className="w-full mt-6"
                onClick={() => handleRoleSelect('student')}
              >
                Start Learning
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-12 animate-fade-in">
          <p className="text-white/70">
            Join thousands of educators and learners worldwide
          </p>
        </div>
      </div>
    </div>
  );
}