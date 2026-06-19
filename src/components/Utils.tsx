import { ReactNode } from "react";
import {
  Folder,
  File,
  Image,
  FileText,
  Music,
  Video,
  Archive,
} from "lucide-react";
import { FileItem } from "./Type";

export function formatSize(size: number | null) {
  if (size === null) return "—";
  if (size < 1024) return `${size} B`;

  const units = ["KB", "MB", "GB", "TB"];
  let value = size / 1024;
  let unit = 0;

  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }

  return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[unit]}`;
}

export function formatDate(ms: number | null) {
  if (ms === null) return "—";
  return new Date(ms).toLocaleString();
}

export function parentPath(path: string) {
  const normalized = path.replace(/[\\/]+$/, "");

  if (/^[A-Za-z]:$/.test(normalized)) {
    return normalized + "\\";
  }

  if (/^[A-Za-z]:\\$/.test(path)) {
    return path;
  }

  const idx = Math.max(
    normalized.lastIndexOf("/"),
    normalized.lastIndexOf("\\"),
  );

  if (idx <= 2) {
    return normalized.slice(0, 2) + "\\";
  }

  return normalized.slice(0, idx);
}

export function getIcon(item: FileItem, size: number) {
  if (item.is_dir) {
    return <Folder size={size} />;
  }

  const ext = item.extension?.split(".").pop()?.toLowerCase();

  switch (ext) {
    case "png":
    case "jpg":
    case "jpeg":
      return <Image size={size} />;

    case "txt":
    case "md":
      return <FileText size={size} />;

    case "mp3":
      return <Music size={size} />;

    case "mp4":
      return <Video size={size} />;

    case "zip":
    case "rar":
      return <Archive size={size} />;

    default:
      return <File size={size} />;
  }
}

export function highlightText(text: string, query: string): ReactNode {
  const trimmed = query.trim();

  if (!trimmed) {
    return text;
  }

  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const regex = new RegExp(`(${escaped})`, "gi");

  return text
    .split(regex)
    .map((part, index) =>
      regex.test(part) ? <mark key={index}>{part}</mark> : part,
    );
}
