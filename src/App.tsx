import { useVirtualizer } from "@tanstack/react-virtual";
import { invoke } from "@tauri-apps/api/core";
import { confirm, open } from "@tauri-apps/plugin-dialog";
import { useEffect, useMemo, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { BootstrapToastContainer, showToast } from "./components/Toast";
import { FileItem, FsEventPayload, SortKey, ViewMode } from "./components/Type";
import { parentPath } from "./components/Utils";
import Tree, { useTree } from "./components/Tree";
import Toolbar from "./components/Toolbar";
import FileList from "./components/List";
import ExplorerControls from "./components/ExplorerControls";

export function App() {
  const [rootPath, setRootPath] = useState("");
  const [currentPath, setCurrentPath] = useState("");
  const [items, setItems] = useState<FileItem[]>([]);
  const [selected, setSelected] = useState<FileItem | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [viewMode, setViewMode] = useState<ViewMode>("details");

  const { tree, expandedFolders, loadTreeRoot, toggleTreeFolder } =
    useTree(setError);

  const iconSize = viewMode === "large-icons" ? 64 : 32;
  const cardWidth = viewMode === "large-icons" ? 140 : 96;
  const rowHeight = viewMode === "large-icons" ? 130 : 92;

  const [containerWidth, setContainerWidth] = useState(0);

  const iconListRef = useRef<HTMLDivElement>(null);
  const currentDirRef = useRef<string>("");
  const parentRef = useRef<HTMLDivElement>(null);

  async function loadDir(path: string) {
    setLoading(true);
    setError("");

    try {
      const result = await invoke<FileItem[]>("list_dir", { path });
      await invoke("switch_watch_dir", { dir: path });
      setItems(result);
      setCurrentPath(path);
      setSelected(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function chooseFolder() {
    const selectedPath = await open({
      directory: true,
      multiple: false,
    });

    if (typeof selectedPath === "string") {
      setRootPath(selectedPath);
      await loadDir(selectedPath);
      await loadTreeRoot(selectedPath);
    }
  }

  async function refresh(dir = currentDirRef.current) {
    if (dir) await loadDir(dir);
  }

  async function goParent() {
    if (!currentPath) return;
    await loadDir(parentPath(currentPath));
  }

  async function create(kind: "file" | "dir") {
    if (!currentPath) return;

    const name = prompt(kind === "file" ? "파일 이름" : "폴더 이름");
    if (!name) return;

    try {
      // await invoke(kind === "file" ? "create_file" : "create_dir", {
      //   dir: currentPath,
      //   name,
      // });
      await refresh();
    } catch (e) {
      setError(String(e));
    }
  }

  async function renameSelected() {
    if (!selected) return;

    const newName = prompt("새 이름", selected.name);
    if (!newName || newName === selected.name) return;

    try {
      // await invoke("rename_path", {
      //   path: selected.path,
      //   newName,
      // });
      await refresh();
    } catch (e) {
      setError(String(e));
    }
  }

  async function deleteSelected() {
    if (!selected) return;
    const ok = await confirm(
      [
        `"${selected.name}" 을(를) 삭제하시겠습니까?`,
        "",
        "절대 경로:",
        selected.path,
      ].join("\n"),
      {
        title: "파일 삭제",
        kind: "warning",
      },
    );

    if (!ok) return;

    try {
      // await invoke("delete_path", { path: selected.path });
      await refresh();
    } catch (e) {
      setError(String(e));
    }
  }

  const visibleItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? items.filter((item) => item.name.toLowerCase().includes(q))
      : items;

    return [...filtered].sort((a, b) => {
      if (a.is_dir !== b.is_dir) return a.is_dir ? -1 : 1;

      if (sortKey === "size") {
        return (a.size ?? -1) - (b.size ?? -1);
      }

      if (sortKey === "modified") {
        return (b.modified_ms ?? 0) - (a.modified_ms ?? 0);
      }

      return a.name.localeCompare(b.name, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    });
  }, [items, query, sortKey]);

  const rowVirtualizer = useVirtualizer({
    count: visibleItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    measureElement: (el) => el?.getBoundingClientRect().height ?? 40,
    overscan: 80,
  });

  useEffect(() => {
    currentDirRef.current = currentPath;
  }, [currentPath]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let mounted = true;

    (async () => {
      const fn = await listen<FsEventPayload>("file-system-event", (e) => {
        if (!mounted) return;
        if (!e.payload?.kind) return;

        showToast(
          `타 어플에서 폴더 내용 변경 감지: ${e.payload.kind}`,
          "success",
        );
        refresh(currentDirRef.current);
      });

      if (mounted) {
        unlisten = fn;
      } else {
        fn();
      }
    })();

    return () => {
      mounted = false;
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    const startPath = "C:\\";
    setRootPath(startPath);

    void (async () => {
      await loadDir(startPath);
      await loadTreeRoot(startPath);
    })();
  }, []);

  useEffect(() => {
    const el = iconListRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      setContainerWidth(el.clientWidth);
    });

    observer.observe(el);
    setContainerWidth(el.clientWidth);

    return () => observer.disconnect();
  }, [viewMode]);

  const columnCount = Math.max(1, Math.floor(containerWidth / cardWidth));
  const rowCount = Math.ceil(visibleItems.length / columnCount);

  const iconVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => iconListRef.current,
    estimateSize: () => rowHeight,
    overscan: 10,
  });

  const regex = useMemo(() => {
    if (!query.trim()) return null;
    const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(${escaped})`, "gi");
  }, [query]);

  const highlightText = (text: string) => {
    if (!regex) return text;

    return text
      .split(regex)
      .map((part, index) =>
        regex.test(part) ? <mark key={index}>{part}</mark> : part,
      );
  };

  return (
    <>
      <style>
        {`
        .form-control,
        .form-select,
        .btn {
          font-size: 0.875rem;
          padding: 5px;
        }
      `}
      </style>
      <main className="d-flex vh-100 bg-light text-dark small">
        <Tree
          rootPath={rootPath}
          currentPath={currentPath}
          tree={tree}
          expandedFolders={expandedFolders}
          loadDir={loadDir}
          chooseFolder={chooseFolder}
          toggleTreeFolder={toggleTreeFolder}
        />

        <section className="d-flex flex-column flex-grow-1 overflow-hidden">
          <Toolbar
            currentPath={currentPath}
            selected={!!selected}
            goParent={goParent}
            refresh={() => refresh()}
            create={create}
            renameSelected={renameSelected}
            deleteSelected={deleteSelected}
          />

          <ExplorerControls
            currentPath={currentPath}
            query={query}
            sortKey={sortKey}
            viewMode={viewMode}
            loading={loading}
            visibleCount={visibleItems.length}
            totalCount={items.length}
            setQuery={setQuery}
            setSortKey={setSortKey}
            setViewMode={setViewMode}
          />

          {error && (
            <section className="bg-white border-bottom fw-semibold small">
              <div className="alert alert-danger m-3">{error}</div>
            </section>
          )}

          <FileList
            viewMode={viewMode}
            visibleItems={visibleItems}
            selected={selected}
            iconListRef={iconListRef}
            parentRef={parentRef}
            iconVirtualizer={iconVirtualizer}
            rowVirtualizer={rowVirtualizer}
            columnCount={columnCount}
            cardWidth={cardWidth}
            rowHeight={rowHeight}
            iconSize={iconSize}
            setSelected={setSelected}
            loadDir={loadDir}
            highlightText={highlightText}
          />
        </section>
      </main>
      <BootstrapToastContainer />
    </>
  );
}
