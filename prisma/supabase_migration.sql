node.exe : warn The configuration property `package.json#prisma` is deprecated and will be removed in Prisma 7. Please 
migrate to a Prisma config file (e.g., `prisma.config.ts`).
At line:1 char:1
+ & "C:\Program Files\nodejs/node.exe" "C:\Program Files\nodejs/node_mo ...
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : NotSpecified: (warn The config...ma.config.ts`).:String) [], RemoteException
    + FullyQualifiedErrorId : NativeCommandError
 
For more information, see: https://pris.ly/prisma-config

Error: P1012

error: Error validating: This line is invalid. It does not start with any known Prisma schema keyword.
  -->  prisma\schema_pg_temp.prisma:1
   | 
   | 
 1 | ∩╗┐datasource db {
 2 |   provider = "postgresql"
   | 
error: Error validating: This line is invalid. It does not start with any known Prisma schema keyword.
  -->  prisma\schema_pg_temp.prisma:2
   | 
 1 | ∩╗┐datasource db {
 2 |   provider = "postgresql"
 3 |   url      = env("DATABASE_URL")
   | 
error: Error validating: This line is invalid. It does not start with any known Prisma schema keyword.
  -->  prisma\schema_pg_temp.prisma:3
   | 
 2 |   provider = "postgresql"
 3 |   url      = env("DATABASE_URL")
 4 | }
   | 
error: Error validating: This line is invalid. It does not start with any known Prisma schema keyword.
  -->  prisma\schema_pg_temp.prisma:4
   | 
 3 |   url      = env("DATABASE_URL")
 4 | }
 5 | 
   | 


