import { currentUser, signOutUser, userAuthConfigured } from "@/server/auth/user";
export async function GET(){const user=await currentUser();return Response.json({authenticated:Boolean(user),email:user?.email??null,configured:userAuthConfigured()});}
export async function DELETE(){await signOutUser();return new Response(null,{status:204});}
