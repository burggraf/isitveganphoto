import * as crypto from "https://deno.land/std/crypto/mod.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

Deno.serve(async (req) => {
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

    // Decode base64 image
    const binaryData = atob(image.split(',')[1])
    const array = new Uint8Array(binaryData.length)
    for (let i = 0; i < binaryData.length; i++) {
      array[i] = binaryData.charCodeAt(i)
    }

    // Generate a unique filename
    const filename = `${crypto.randomUUID()}.jpg`

    // Upload image to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseClient
      .storage
      .from('vegan-images')
      .upload(filename, array.buffer, {
        contentType: 'image/jpeg',
      })

    if (uploadError) {
      throw new Error(`Failed to upload image: ${uploadError.message}`)
    }

    // TODO: Implement image processing logic here
    // For now, we'll just return a placeholder response
    const data = {
      isVegan: true,
      confidence: 0.95,
      imageUrl: uploadData.path,
    }

    return new Response(
      JSON.stringify({ data, error: null }),
      { headers: { "Content-Type": "application/json" } },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ data: null, error: error.message }),
      { headers: { "Content-Type": "application/json" }, status: 400 },
    )
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
