import { useState } from "react";
import { RoleSelection } from "@/components/RoleSelection";
import { TeacherDashboard } from "@/components/TeacherDashboard";
import { StudentDashboard } from "@/components/StudentDashboard";

const Index = () => {
  const [userRole, setUserRole] = useState<'teacher' | 'student' | null>(null);

  const handleRoleSelect = (role: 'teacher' | 'student') => {
    setUserRole(role);
  };

  const handleLogout = () => {
    setUserRole(null);
  };

  if (!userRole) {
    return <RoleSelection onRoleSelect={handleRoleSelect} />;
  }

  if (userRole === 'teacher') {
    return <TeacherDashboard onLogout={handleLogout} />;
  }

  return <StudentDashboard onLogout={handleLogout} />;
};

export default Index;
