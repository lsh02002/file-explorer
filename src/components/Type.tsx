export type ViewMode = "large-icons" | "icons" | "details" | "list";

export type FileItem = {
  name: string;
  path: string;
  is_dir: boolean;
  size: number | null;
  extension: string | null;
  modified_ms: number | null;
  has_children: boolean;
};

export type TreeNode = FileItem & {
  children?: TreeNode[];
  loaded?: boolean;
};

export type FsEventPayload = {
  kind: string;
  paths: string[];
};

export type SortKey = "name" | "size" | "modified";
