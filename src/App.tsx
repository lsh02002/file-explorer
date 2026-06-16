import { useVirtualizer } from "@tanstack/react-virtual";
import { invoke } from "@tauri-apps/api/core";
import { confirm, open } from "@tauri-apps/plugin-dialog";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Folder,
  File,
  Image,
  FileText,
  Music,
  Video,
  Archive,
} from "lucide-react";

type ViewMode = "large-icons" | "icons" | "details" | "list";

type FileItem = {
  name: string;
  path: string;
  is_dir: boolean;
  size: number | null;
  extension: string | null;
  modified_ms: number | null;
};

type SortKey = "name" | "size" | "modified";

function formatSize(size: number | null) {
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

function formatDate(ms: number | null) {
  if (ms === null) return "—";
  return new Date(ms).toLocaleString();
}

function parentPath(path: string) {
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

function getIcon(item: FileItem, size: number) {
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

  const iconListRef = useRef<HTMLDivElement>(null);

  const iconSize = viewMode === "large-icons" ? 64 : 32;
  const cardWidth = viewMode === "large-icons" ? 140 : 96;
  const rowHeight = viewMode === "large-icons" ? 130 : 92;

  const [containerWidth, setContainerWidth] = useState(0);

  async function loadDir(path: string) {
    setLoading(true);
    setError("");

    try {
      const result = await invoke<FileItem[]>("list_dir", { path });
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
    }
  }

  async function refresh() {
    if (currentPath) await loadDir(currentPath);
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

  const folders = useMemo(() => {
    return items
      .filter((item) => item.is_dir)
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, {
          numeric: true,
          sensitivity: "base",
        }),
      );
  }, [items]);

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

  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: visibleItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    measureElement: (el) => el?.getBoundingClientRect().height ?? 40,
    overscan: 80,
  });

  useEffect(() => {
    const startPath = "C:\\";
    setRootPath(startPath);
    void loadDir(startPath);
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
    <main className="d-flex vh-100 bg-light text-dark">
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
          {folders.map((folder) => (
            <div
              key={folder.path}
              className={`p-2 rounded text-truncate ${
                currentPath === folder.path ? "bg-primary text-white" : ""
              }`}
              role="button"
              onClick={() => loadDir(folder.path)}
            >
              📁 {folder.name}
            </div>
          ))}
        </div>
      </aside>

      <section className="d-flex flex-column flex-grow-1 overflow-hidden">
        <header className="d-flex flex-wrap gap-2 p-3 bg-white border-bottom">
          <button
            className="btn btn-outline-secondary"
            onClick={goParent}
            disabled={!currentPath}
          >
            상위
          </button>
          <button
            className="btn btn-outline-secondary"
            onClick={refresh}
            disabled={!currentPath}
          >
            새로고침
          </button>
          <button
            className="btn btn-outline-secondary"
            onClick={() => create("file")}
            disabled={!currentPath}
          >
            파일 생성
          </button>
          <button
            className="btn btn-outline-secondary"
            onClick={() => create("dir")}
            disabled={!currentPath}
          >
            폴더 생성
          </button>
          <button
            className="btn btn-outline-secondary"
            onClick={renameSelected}
            disabled={!selected}
          >
            이름 변경
          </button>
          <button
            className="btn btn-outline-danger"
            onClick={deleteSelected}
            disabled={!selected}
          >
            삭제
          </button>
        </header>

        <section className="px-3 py-2 bg-body-tertiary border-bottom">
          <strong>현재:</strong>{" "}
          <span>{currentPath || "폴더를 선택하세요"}</span>
        </section>

        <section className="d-flex gap-2 align-items-center p-3 bg-white border-bottom">
          <input
            className="form-control"
            placeholder="현재 폴더에서 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </section>

        <section className="d-flex gap-2 align-items-center p-3 bg-white border-bottom">
          <select
            className="form-select"
            style={{ width: 140 }}
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
          >
            <option value="name">이름순</option>
            <option value="size">크기순</option>
            <option value="modified">수정일순</option>
          </select>

          <select
            className="form-select"
            style={{ width: 150 }}
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as ViewMode)}
          >
            <option value="large-icons">큰 아이콘</option>
            <option value="icons">보통 아이콘</option>
            <option value="details">자세히</option>
            <option value="list">간단히</option>
          </select>

          <span className="text-secondary small">
            {loading
              ? "로딩 중..."
              : `${visibleItems.length.toLocaleString()}개 표시 / ${items.length.toLocaleString()}개 전체`}
          </span>
        </section>

        {error && (
          <pre className="alert alert-danger m-3 overflow-auto">{error}</pre>
        )}

        {viewMode === "details" && (
          <section className="bg-light border-bottom fw-semibold small px-3 py-2">
            <div className="row g-0">
              <div className="col">이름</div>
              <div className="col-2">크기</div>
              <div className="col-3">수정일</div>
            </div>
          </section>
        )}

        {viewMode === "large-icons" || viewMode === "icons" ? (
          <section
            ref={iconListRef}
            className={`iconView ${viewMode} flex-grow-1 overflow-auto bg-white`}
          >
            <div
              style={{
                height: `${iconVirtualizer.getTotalSize()}px`,
                position: "relative",
                width: "100%",
              }}
            >
              {iconVirtualizer.getVirtualItems().map((virtualRow) => {
                const rowIndex = virtualRow.index;
                const startIndex = rowIndex * columnCount;
                const rowItems = visibleItems.slice(
                  startIndex,
                  startIndex + columnCount,
                );

                return (
                  <div
                    key={virtualRow.key}
                    className="position-absolute top-0 start-0 w-100 d-grid gap-3 px-3 py-2"
                    style={{
                      height: `${rowHeight}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                      gridTemplateColumns: `repeat(${columnCount}, ${cardWidth}px)`,
                    }}
                  >
                    {rowItems.map((item) => (
                      <div
                        key={item.path}
                        className={`card border-0 h-100 p-2 text-center rounded-3 ${
                          selected?.path === item.path
                            ? "bg-primary-subtle"
                            : "bg-white"
                        }`}
                        role="button"
                        onClick={() => setSelected(item)}
                        onDoubleClick={() => item.is_dir && loadDir(item.path)}
                      >
                        <div
                          className="d-flex align-items-center justify-content-center"
                          style={{
                            height: viewMode === "large-icons" ? 70 : 38,
                          }}
                        >
                          {getIcon(item, iconSize)}
                        </div>

                        <div
                          className="mt-2 small text-break overflow-hidden"
                          style={{
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                          }}
                        >
                          {highlightText(item.name)}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </section>
        ) : (
          <section
            ref={parentRef}
            className={`flex-grow-1 overflow-auto bg-white ${
              viewMode === "details" ? "small" : ""
            }`}
          >
            <div
              className="position-relative"
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const item = visibleItems[virtualRow.index];

                return (
                  <div
                    key={item.path}
                    data-index={virtualRow.index}
                    ref={rowVirtualizer.measureElement}
                    className={`position-absolute top-0 start-0 w-100 px-3 py-2 border-bottom ${
                      selected?.path === item.path
                        ? "bg-primary-subtle"
                        : "bg-white"
                    }`}
                    role="button"
                    style={{
                      minHeight: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    onClick={() => setSelected(item)}
                    onDoubleClick={() => item.is_dir && loadDir(item.path)}
                  >
                    {viewMode === "details" ? (
                      <div className="d-flex align-items-start gap-3">
                        <div className="d-flex align-items-center gap-2 flex-grow-1 overflow-hidden">
                          {getIcon(item, 18)}
                          <span className="text-truncate">
                            {highlightText(item.name)}
                          </span>
                        </div>

                        <div
                          className="text-secondary flex-shrink-0 text-end"
                          style={{ width: "120px" }}
                        >
                          {formatSize(item.size)}
                        </div>

                        <div
                          className="text-secondary flex-shrink-0 text-wrap"
                          style={{
                            width: "220px",
                            maxWidth: "35%",
                            overflowWrap: "break-word",
                          }}
                        >
                          {formatDate(item.modified_ms)}
                        </div>
                      </div>
                    ) : (
                      <div className="d-flex align-items-center gap-2 overflow-hidden">
                        {getIcon(item, 18)}
                        <span className="text-truncate">
                          {highlightText(item.name)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
