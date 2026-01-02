import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SeedRequest {
  users: Array<{
    email: string;
    password: string;
    fullName: string;
    role: "admin" | "user";
  }>;
  secretKey: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { users, secretKey }: SeedRequest = await req.json();

    // Simple secret check - in production use a proper secret
    if (secretKey !== "SEED_ADMIN_2024") {
      return new Response(
        JSON.stringify({ error: "Invalid secret key" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = [];

    for (const userData of users) {
      console.log(`Creating user: ${userData.email} with role: ${userData.role}`);

      // Check if user already exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email === userData.email);

      if (existingUser) {
        console.log(`User ${userData.email} already exists`);
        
        // Check if role exists
        const { data: existingRole } = await supabaseAdmin
          .from("user_roles")
          .select("*")
          .eq("user_id", existingUser.id)
          .maybeSingle();

        if (!existingRole) {
          // Assign role if not exists
          await supabaseAdmin
            .from("user_roles")
            .insert({
              user_id: existingUser.id,
              role: userData.role,
            });
        }

        results.push({
          email: userData.email,
          status: "already_exists",
          userId: existingUser.id,
        });
        continue;
      }

      // Create the user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: {
          full_name: userData.fullName,
        },
      });

      if (createError) {
        console.error(`Error creating user ${userData.email}:`, createError);
        results.push({
          email: userData.email,
          status: "error",
          error: createError.message,
        });
        continue;
      }

      // Assign the role
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({
          user_id: newUser.user.id,
          role: userData.role,
        });

      if (roleError) {
        console.error(`Error assigning role for ${userData.email}:`, roleError);
      }

      results.push({
        email: userData.email,
        status: "created",
        userId: newUser.user.id,
        role: userData.role,
      });

      console.log(`User ${userData.email} created successfully`);
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in seed-admin function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
