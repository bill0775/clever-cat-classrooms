-- Create user roles enum
CREATE TYPE public.user_role AS ENUM ('teacher', 'student');

-- Create profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'student',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create courses table
CREATE TABLE public.courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  instructor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create enrollments table (students enrolled in courses)
CREATE TABLE public.enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, course_id)
);

-- Create assignments table
CREATE TABLE public.assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create assignment submissions table
CREATE TABLE public.assignment_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  grade INTEGER CHECK (grade >= 0 AND grade <= 100),
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  graded_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(assignment_id, student_id)
);

-- Create messages table for chat functionality
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for courses
CREATE POLICY "Anyone can view courses" ON public.courses FOR SELECT USING (true);
CREATE POLICY "Teachers can create courses" ON public.courses FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'teacher')
);
CREATE POLICY "Teachers can update their own courses" ON public.courses FOR UPDATE USING (instructor_id = auth.uid());
CREATE POLICY "Teachers can delete their own courses" ON public.courses FOR DELETE USING (instructor_id = auth.uid());

-- RLS Policies for enrollments
CREATE POLICY "Students can view their enrollments" ON public.enrollments FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Teachers can view enrollments for their courses" ON public.enrollments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND instructor_id = auth.uid())
);
CREATE POLICY "Students can enroll in courses" ON public.enrollments FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "Students can update their progress" ON public.enrollments FOR UPDATE USING (student_id = auth.uid());

-- RLS Policies for assignments
CREATE POLICY "Students can view assignments for enrolled courses" ON public.assignments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.enrollments WHERE course_id = assignments.course_id AND student_id = auth.uid())
);
CREATE POLICY "Teachers can view assignments for their courses" ON public.assignments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND instructor_id = auth.uid())
);
CREATE POLICY "Teachers can create assignments for their courses" ON public.assignments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND instructor_id = auth.uid())
);
CREATE POLICY "Teachers can update assignments for their courses" ON public.assignments FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND instructor_id = auth.uid())
);

-- RLS Policies for assignment submissions
CREATE POLICY "Students can view their own submissions" ON public.assignment_submissions FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Teachers can view submissions for their course assignments" ON public.assignment_submissions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.assignments a 
    JOIN public.courses c ON a.course_id = c.id 
    WHERE a.id = assignment_id AND c.instructor_id = auth.uid()
  )
);
CREATE POLICY "Students can submit assignments" ON public.assignment_submissions FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "Students can update their submissions" ON public.assignment_submissions FOR UPDATE USING (student_id = auth.uid() AND graded_at IS NULL);
CREATE POLICY "Teachers can grade submissions" ON public.assignment_submissions FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.assignments a 
    JOIN public.courses c ON a.course_id = c.id 
    WHERE a.id = assignment_id AND c.instructor_id = auth.uid()
  )
);

-- RLS Policies for messages
CREATE POLICY "Users can view messages they sent or received" ON public.messages FOR SELECT USING (
  sender_id = auth.uid() OR recipient_id = auth.uid() OR 
  (course_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.enrollments WHERE course_id = messages.course_id AND student_id = auth.uid())) OR
  (course_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.courses WHERE id = messages.course_id AND instructor_id = auth.uid()))
);
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (sender_id = auth.uid());

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();