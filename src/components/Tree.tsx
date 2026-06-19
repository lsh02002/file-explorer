import { useState } from "react";
import { FileItem, TreeNode } from "./Type";
import { invoke } from "@tauri-apps/api/core";

type Props = {
  rootPath: string;
  currentPath: string;
  tree: TreeNode[];
  expandedFolders: Record<string, boolean>;

  loadDir: (path: string) => Promise<void>;
  chooseFolder: () => Promise<void>;
  toggleTreeFolder: (folder: TreeNode) => Promise<void>;
};

export default function Tree({
  rootPath,
  currentPath,
  tree,
  expandedFolders,
  loadDir,
  chooseFolder,
  toggleTreeFolder,
}: Props) {
  function FolderTreeItem({
    folder,
    level = 0,
  }: {
    folder: TreeNode;
    level?: number;
  }) {
    const isExpanded = expandedFolders[folder.path];
    const hasChildren = folder.has_children;

    return (
      <>
        <div
          className={`py-2 pe-2 rounded d-flex align-items-center text-truncate ${
            currentPath === folder.path ? "bg-primary text-white" : ""
          }`}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
        >
          <span
            className="me-1 d-inline-flex justify-content-center"
            style={{ width: 16, flexShrink: 0 }}
          >
            {hasChildren && (
              <span
                role="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleTreeFolder(folder);
                }}
              >
                {isExpanded ? "⌵" : ">"}
              </span>
            )}
          </span>

          <span
            role="button"
            className="text-truncate flex-grow-1"
            onClick={() => loadDir(folder.path)}
          >
            📁 {folder.name}
          </span>
        </div>

        {hasChildren &&
          isExpanded &&
          folder.children?.map((child) => (
            <FolderTreeItem key={child.path} folder={child} level={level + 1} />
          ))}
      </>
    );
  }

  return (
    <aside
      className="border-end bg-white p-3 d-flex flex-column"
      style={{ width: 260, height: "100%" }}
    >
      <button
        className="btn btn-outline-secondary w-100 mb-3"
        onClick={chooseFolder}
      >
        폴더 열기
      </button>

      <div
        className={`p-2 rounded cursor-pointer ${
          currentPath === rootPath ? "bg-primary text-white" : "bg-light"
        }`}
        onClick={() => rootPath && loadDir(rootPath)}
      >
        📁 {rootPath || "폴더를 선택하세요"}
      </div>

      <div className="mt-3 mb-2 fw-bold text-secondary small">하위 폴더</div>

      <div className="overflow-auto flex-grow-1">
        {tree.map((folder) => (
          <FolderTreeItem key={folder.path} folder={folder} />
        ))}
      </div>
    </aside>
  );
}

export function useTree(setError: (message: string) => void) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<
    Record<string, boolean>
  >({});

  async function loadChildFolders(path: string) {
    const result = await invoke<FileItem[]>("list_folders", { path });

    return result
      .filter((item) => item.is_dir)
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, {
          numeric: true,
          sensitivity: "base",
        }),
      )
      .map((item) => ({
        ...item,
        children: [],
        loaded: false,
      }));
  }

  async function loadTreeRoot(path: string) {
    if (!path) return;

    const children = await loadChildFolders(path);

    setTree([
      {
        name: path,
        path,
        is_dir: true,
        size: null,
        extension: null,
        modified_ms: null,
        has_children: children.length > 0,
        children,
        loaded: true,
      },
    ]);

    setExpandedFolders((prev) => ({
      ...prev,
      [path]: true,
    }));
  }

  function updateTreeChildren(
    nodes: TreeNode[],
    path: string,
    children: TreeNode[],
  ): TreeNode[] {
    return nodes.map((node) => {
      if (node.path === path) {
        return {
          ...node,
          children,
          loaded: true,
        };
      }

      return {
        ...node,
        children: node.children
          ? updateTreeChildren(node.children, path, children)
          : node.children,
      };
    });
  }

  async function toggleTreeFolder(folder: TreeNode) {
    if (!folder.has_children) return;

    const isExpanded = expandedFolders[folder.path];

    if (!isExpanded && !folder.loaded) {
      try {
        const children = await loadChildFolders(folder.path);
        setTree((prev) => updateTreeChildren(prev, folder.path, children));
      } catch (e) {
        setError(String(e));
        return;
      }
    }

    setExpandedFolders((prev) => ({
      ...prev,
      [folder.path]: !prev[folder.path],
    }));
  }

  return {
    tree,
    expandedFolders,
    loadTreeRoot,
    toggleTreeFolder,
  };
}
