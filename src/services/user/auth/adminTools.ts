
import { supabase } from '@/integrations/supabase/client';
import { User } from '@/types';

/**
 * Utility function to check all user accounts in the database
 * This is for administrative and debugging purposes only
 */
export async function checkAllAccounts(): Promise<{
  profiles: any[] | null;
  users: any[] | null;
  technicians: any[] | null;
  error: any | null;
}> {
  try {
    console.log('Checking all accounts in the database...');
    
    // Check profiles table
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('role');
      
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    } else {
      console.log('Found profiles:', profilesData.length);
      profilesData.forEach(profile => {
        console.log(`- ${profile.name} (${profile.email}): ${profile.role}`);
      });
    }
    
    // Check legacy users table
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .order('role');
      
    if (usersError) {
      console.error('Error fetching users:', usersError);
    } else {
      console.log('Found legacy users:', usersData.length);
      usersData.forEach(user => {
        console.log(`- ${user.name} (${user.email}): ${user.role}`);
      });
    }
    
    // Check technicians table
    const { data: techniciansData, error: techniciansError } = await supabase
      .from('technicians')
      .select('*');
      
    if (techniciansError) {
      console.error('Error fetching technicians:', techniciansError);
    } else {
      console.log('Found technicians:', techniciansData.length);
      techniciansData.forEach(tech => {
        console.log(`- ${tech.name} (${tech.email})`);
      });
    }
    
    return {
      profiles: profilesData || null,
      users: usersData || null,
      technicians: techniciansData || null,
      error: profilesError || usersError || techniciansError || null
    };
  } catch (error) {
    console.error('Error checking accounts:', error);
    return {
      profiles: null,
      users: null,
      technicians: null,
      error
    };
  }
}

/**
 * Function to fix the special accounts after refactoring
 * This will ensure that our demo accounts still work
 */
export async function fixSpecialAccounts(): Promise<string> {
  try {
    console.log('Fixing special accounts...');
    
    // Check if betonipaulo@gmail.com exists in the auth.users table
    const { data: existingUser, error: existingUserError } = await supabase.auth
      .signInWithPassword({
        email: 'betonipaulo@gmail.com',
        password: '1234'
      });
      
    if (existingUserError) {
      console.log('Special account not found in auth, creating it...');
      
      // Create the special accounts in auth.users
      const { data: createBeto니, error: createBetoニError } = await supabase.auth
        .signUp({
          email: 'betonipaulo@gmail.com',
          password: '1234',
          options: {
            data: {
              name: 'Paulo Betoni',
              role: 'client'
            }
          }
        });
        
      if (createBetoニError) {
        console.error('Error creating betonipaulo account:', createBetoニError);
      } else {
        console.log('Created betonipaulo account successfully');
      }
      
      const { data: createJoao, error: createJoaoError } = await supabase.auth
        .signUp({
          email: 'joaooficina@gmail.com',
          password: '1234',
          options: {
            data: {
              name: 'João Oficina',
              role: 'workshop'
            }
          }
        });
        
      if (createJoaoError) {
        console.error('Error creating joaooficina account:', createJoaoError);
      } else {
        console.log('Created joaooficina account successfully');
      }
      
      return "Special accounts created. Verification emails might have been sent. Check Supabase Auth settings to disable email verification if needed.";
    } else {
      return "Special accounts already exist in the authentication system.";
    }
  } catch (error) {
    console.error('Error fixing special accounts:', error);
    return `Error fixing special accounts: ${error}`;
  }
}
