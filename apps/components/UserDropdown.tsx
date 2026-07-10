"use client";
import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import NavItems from "./NavItems";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils"; // adjust import path as needed

const UserDropdown = () => {
  const router = useRouter();
  const user = { name: "John", email: "contact@email.com" };

  const handleSignOut = async () => {
    router.push("/sign-in");
  };

  return (
    <DropdownMenu>
      {/* ✅ Use DropdownMenuTrigger as the button itself */}
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "flex items-center gap-3 text-gray-400 hover:text-yellow-500",
        )}
      >
        <Avatar className="h-8 w-8">
          <AvatarImage src="https://github.com/shadcn.png" />
          <AvatarFallback className="bg-yellow-500 text-yellow-900 text-sm font-bold">
            {user.name[0]}
          </AvatarFallback>
        </Avatar>
        <div className="hidden md:flex flex-col items-start">
          <span className="text-base font-medium text-gray-400">
            {user.name}
          </span>
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-40 text-gray-400">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <div className="flex relative items-center gap-3 py-2">
              <Avatar className="h-10 w-10">
                <AvatarImage src="https://github.com/shadcn.png" />
                <AvatarFallback className="bg-yellow-500 text-yellow-900 text-sm font-bold">
                  {user.name[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-base font-medium text-gray-400">
                  {user.name}
                </span>
                <span className="text-sm text-gray-500">{user.email}</span>
              </div>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="bg-gray-600" />

        <DropdownMenuItem
          onClick={handleSignOut}
          className="text-gray-100 text-md font-medium focus:bg-transparent focus:text-yellow-500 transition-colors cursor-pointer"
        >
          <LogOut className="h-4 w-4 mr-2 hidden sm:block" />
          Log Out
        </DropdownMenuItem>

        <DropdownMenuSeparator className="hidden sm:block bg-gray-600" />

        <nav className="sm:hidden">
          <NavItems />
        </nav>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserDropdown;
