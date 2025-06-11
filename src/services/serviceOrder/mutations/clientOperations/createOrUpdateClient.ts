
import { supabase } from '@/integrations/supabase/client';
import { Client } from '@/types';
import { updateExistingClient } from './updateExistingClient';
import { linkClientWithUserAccount } from './linkClientWithUserAccount';
import { toast } from 'sonner';

/**
 * Creates or updates a client record and returns the client ID
 */
export async function createOrUpdateClient(clientData: Partial<Client>): Promise<string | null> {
  try {
    console.log("Creating/updating client with data:", clientData);
    
    let existingClientId: string | null = null;
    
    // Normalize client data for better matching
    const normalizedName = clientData.name?.trim().toLowerCase() || '';
    const normalizedEmail = clientData.email?.trim().toLowerCase() || '';
    const normalizedPhone = clientData.phone?.replace(/[^0-9]/g, '') || '';
    
    // Step 1: Try to find an exact match by email (most reliable)
    if (normalizedEmail) {
      console.log("Checking for existing client with email:", normalizedEmail);
      const { data: emailMatches } = await supabase
        .from('clients')
        .select('id, user_id, name')
        .ilike('email', normalizedEmail)
        .maybeSingle();
        
      if (emailMatches) {
        console.log("Found existing client by email:", emailMatches);
        existingClientId = emailMatches.id;
        
        await linkClientWithUserAccount(existingClientId, emailMatches.user_id, clientData);
        return await updateExistingClient(existingClientId, clientData);
      }
    }
    
    // Step 2: Try to find by phone number with normalization
    if (normalizedPhone && normalizedPhone.length >= 8) {
      console.log("Checking for existing client with phone:", normalizedPhone);
      
      // Get all clients to filter by normalized phone
      const { data: allClients } = await supabase
        .from('clients')
        .select('id, user_id, phone, name')
        .not('phone', 'is', null);
      
      if (allClients && allClients.length > 0) {
        // Find client by normalized phone number
        const matchingClient = allClients.find(client => {
          const clientNormalizedPhone = client.phone?.replace(/[^0-9]/g, '') || '';
          
          // Match on last digits if the lengths are different
          if (normalizedPhone.length >= 8 && clientNormalizedPhone.length >= 8) {
            const lastDigitsMatch = normalizedPhone.endsWith(clientNormalizedPhone.substr(-8)) || 
                                   clientNormalizedPhone.endsWith(normalizedPhone.substr(-8));
            return lastDigitsMatch;
          }
          
          return clientNormalizedPhone === normalizedPhone;
        });
        
        if (matchingClient) {
          console.log("Found existing client by normalized phone:", matchingClient);
          existingClientId = matchingClient.id;
          
          await linkClientWithUserAccount(existingClientId, matchingClient.user_id, clientData);
          return await updateExistingClient(existingClientId, clientData);
        }
      }
    }
    
    // Step 3: Look for exact name match
    if (normalizedName) {
      console.log("Checking for existing client with exact name:", normalizedName);
      const { data: nameMatches } = await supabase
        .from('clients')
        .select('id, user_id, name')
        .ilike('name', normalizedName)
        .maybeSingle();
        
      if (nameMatches) {
        console.log("Found existing client by name:", nameMatches);
        existingClientId = nameMatches.id;
        
        await linkClientWithUserAccount(existingClientId, nameMatches.user_id, clientData);
        return await updateExistingClient(existingClientId, clientData);
      }
    }
    
    // Step 4: Fuzzy name matching if we have both name and phone or email as additional confirmation
    if (normalizedName && (normalizedPhone || normalizedEmail)) {
      console.log("Running fuzzy matching for client name:", normalizedName);
      
      // Get clients with similar names
      const { data: similarNameClients } = await supabase
        .from('clients')
        .select('id, name, email, phone, user_id')
        .ilike('name', `%${normalizedName.split(' ')[0]}%`); // Match on first name
        
      if (similarNameClients && similarNameClients.length > 0) {
        // Score each client by similarity to input data
        const scoredClients = similarNameClients.map(client => {
          let score = 0;
          
          // Score name similarity (basic tokens comparison)
          const clientNameTokens = client.name.toLowerCase().split(' ');
          const inputNameTokens = normalizedName.split(' ');
          const nameIntersection = clientNameTokens.filter(token => 
            inputNameTokens.includes(token) && token.length > 2
          );
          score += nameIntersection.length * 10;
          
          // Additional score for email match
          if (normalizedEmail && client.email && 
              client.email.toLowerCase() === normalizedEmail) {
            score += 50;
          }
          
          // Additional score for phone match
          if (normalizedPhone && client.phone) {
            const clientNormalizedPhone = client.phone.replace(/[^0-9]/g, '');
            if (normalizedPhone.endsWith(clientNormalizedPhone.substr(-8)) || 
                clientNormalizedPhone.endsWith(normalizedPhone.substr(-8))) {
              score += 40;
            }
          }
          
          return { client, score };
        });
        
        // Sort by score and find best match
        const bestMatch = scoredClients.filter(item => item.score >= 20)
          .sort((a, b) => b.score - a.score)[0];
        
        if (bestMatch) {
          console.log(`Found client match: ${bestMatch.client.name} with score ${bestMatch.score}`);
          existingClientId = bestMatch.client.id;
          
          await linkClientWithUserAccount(existingClientId, bestMatch.client.user_id, clientData);
          return await updateExistingClient(existingClientId, clientData);
        }
      }
    }
    
    // If no existing client, create a new one
    if (!existingClientId) {
      console.log("No existing client found. Creating new client with data:", clientData);
      
      // Use the RPC function to create a client bypass RLS
      const { data: createdClient, error } = await supabase
        .rpc('create_client', {
          client_name: clientData.name || 'Cliente sem nome',
          client_email: clientData.email || null,
          client_phone: clientData.phone || null,
          client_address: clientData.address || null,
          client_city: clientData.city || null,
          client_state: clientData.state || null,
          client_zip_code: clientData.zipCode || null
        })
        .select('id, user_id')
        .single();
      
      if (error) {
        console.error("Error creating client:", error);
        toast.error("Erro ao criar cliente");
        return null;
      }
      
      if (createdClient) {
        console.log("New client created with ID:", createdClient.id);
        
        // Create user account if email is present
        if (clientData.email && !createdClient.user_id) {
          await linkClientWithUserAccount(createdClient.id, null, clientData);
        }
        
        return createdClient.id;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error in createOrUpdateClient:', error);
    toast.error("Erro ao criar cliente");
    return null;
  }
}
