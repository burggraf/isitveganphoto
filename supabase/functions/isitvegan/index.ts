//import * as crypto from "https://deno.land/std/crypto/mod.ts"
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

Deno.serve(async (req) => {
  // Add CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { image } = await req.json()

    if (!image) {
      throw new Error("Image parameter is required")
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
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

    // Analyze the image using Anthropic API
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }
    console.log("Anthropic API key found")

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01"  // Add API version header
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        //model: "claude-3-haiku-20240307",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/jpeg",
                  data: image.split(',')[1],
                },
              },
              {
                type: "text",
                text: "Extract the product ingredients from this photo. Analyze the ingredients to determine whether or not the product is vegan. Ignore anything in the photo that does not appear to be ingredients.",
              },
            ],
          },
        ],
      }),
    });

    if (!anthropicResponse.ok) {
      console.error("Anthropic API error", anthropicResponse.statusText);
      const errorBody = await anthropicResponse.text();
      console.error("Error body:", errorBody);
      throw new Error(`Anthropic API error: ${anthropicResponse.statusText}`);
    }

    const analysisResult = await anthropicResponse.json();
    console.log("Anthropic API response", analysisResult)
    const data = {
      result: analysisResult,
      imageUrl: uploadData.path,
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
