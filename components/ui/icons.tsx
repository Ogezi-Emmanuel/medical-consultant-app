import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

import { ChevronDown, ChevronRight, Command, File, GitBranch, GitCommit, GitMerge, GitPullRequest, Github, HardDrive, List, MoreVertical, Search, X, Check, Copy, RefreshCcw, CornerDownLeft, Plus } from "lucide-react"

export const IconArrowDown = ChevronDown
export const IconArrowRight = ChevronRight
export const IconCommand = Command
export const IconFile = File
export const IconGitBranch = GitBranch
export const IconGitCommit = GitCommit
export const IconGitMerge = GitMerge
export const IconGitPullRequest = GitPullRequest
export const IconGithub = Github
export const IconHardDrive = HardDrive
export const IconList = List
export const IconMoreVertical = MoreVertical
export const IconSearch = Search
export const IconSeparator = MoreVertical
export const IconX = X
export const IconCheck = Check
export const IconCopy = Copy
export const IconRefresh = RefreshCcw
export const IconArrowElbow = CornerDownLeft
export const IconPlus = Plus