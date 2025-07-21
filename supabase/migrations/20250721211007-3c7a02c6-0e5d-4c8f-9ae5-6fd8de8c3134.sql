-- Drop and recreate the trigger function with proper type handling
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create an improved function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role_value text;
BEGIN
  -- Get the role from metadata, default to 'student'
  user_role_value := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
  
  -- Insert into profiles table
  INSERT INTO public.profiles (user_id, full_name, role)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), 
    user_role_value::public.user_role
  );
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log the error and still allow user creation
    RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();