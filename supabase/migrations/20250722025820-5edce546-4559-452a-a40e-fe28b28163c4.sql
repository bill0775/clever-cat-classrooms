-- Add policy to allow teachers to enroll students in their courses
CREATE POLICY "Teachers can enroll students in their courses" 
ON public.enrollments 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM courses 
    WHERE courses.id = enrollments.course_id 
    AND courses.instructor_id = auth.uid()
  )
);