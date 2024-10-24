//import * as crypto from "https://deno.land/std/crypto/mod.ts"
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { getAIProvider } from './ai-providers.ts';

// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { image } = await req.json()

    if (!image) {
      throw new Error("Image parameter is required")
    }

    console.log("SUPABASE_URL:", Deno.env.get('SUPABASE_URL'));
    console.log("SUPABASE_SERVICE_ROLE_KEY set:", !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { 
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    console.log("Supabase client initialized")
    // Decode base64 image
    const binaryData = atob(image.split(',')[1])
    const array = new Uint8Array(binaryData.length)
    for (let i = 0; i < binaryData.length; i++) {
      array[i] = binaryData.charCodeAt(i)
    }
    console.log("Image decoded")

    // Create a unique filename by generating a random UUID
    const uniqueFilename = `${crypto.randomUUID()}.jpg`;
    
    // Generate a unique filename
    let filename;
    try {
      filename = uniqueFilename
      
    } catch (e) {
      console.error("Error generating random UUID", e)
      filename = `${Date.now()}.jpg`
    }


/*    
    console.log("Uploading image to Supabase Storage", filename)
    // Upload image to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseClient
      .storage
      .from('vegan-images')
      .upload(filename, array.buffer, {
        contentType: 'image/jpeg',
      })
    console.log('uploadData', uploadData)
    console.log('uploadError', uploadError)

    if (uploadError) {
      throw new Error(`Failed to upload image: ${uploadError.message}`)
    }
*/

    // Choose AI provider (you can change this to 'openai' or 'anthropic' when ready)
    const aiProvider = getAIProvider('openai');

    console.log("Analyzing image with AI provider");
    const analysisResult = await aiProvider.analyzeImage(image);
    console.log("AI provider response", analysisResult);

    // Save the result to the scans table
    const { data: insertData, error: insertError } = await supabaseClient
      .from('scans')
      .insert({
        result: analysisResult,
        error: null
      });

    if (insertError) {
      console.error("Error inserting scan result:", insertError);
      throw new Error(`Failed to save scan result: ${insertError.message}`);
    }

    const data = {
      result: analysisResult,
      //imageUrl: uploadData.path,
    };

    return new Response(
      JSON.stringify({ data, error: null }),
      { 
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        } 
      },
    );
  } catch (error) {
    console.error("Error in processing:", error);

    // Save the error to the scans table
    const { data: insertData, error: insertError } = await supabaseClient
      .from('scans')
      .insert({
        result: null,
        error: { message: error.message, stack: error.stack }
      });

    if (insertError) {
      console.error("Error inserting scan error:", insertError);
    }

    return new Response(
      JSON.stringify({ 
        data: { 
          analysisError: error.message 
        }, 
        error: error.message 
      }),
      { 
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        }, 
        status: 400 
      },
    );
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
   2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/isitvegan' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
