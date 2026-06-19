import type { Virtualizer } from "@tanstack/react-virtual";
import type { RefObject } from "react";
import { FileItem, ViewMode } from "./Type";
import { formatDate, formatSize, getIcon, highlightText } from "./Utils";

type Props = {
  viewMode: ViewMode;
  visibleItems: FileItem[];
  selected: FileItem | null;

  iconListRef: RefObject<HTMLDivElement | null>;
  parentRef: RefObject<HTMLDivElement | null>;

  iconVirtualizer: Virtualizer<HTMLDivElement, Element>;
  rowVirtualizer: Virtualizer<HTMLDivElement, Element>;

  columnCount: number;
  cardWidth: number;
  rowHeight: number;
  iconSize: number;
  query: string;

  setSelected: (item: FileItem) => void;
  loadDir: (path: string) => void | Promise<void>;
};

export default function FileList({
  viewMode,
  visibleItems,
  selected,
  iconListRef,
  parentRef,
  iconVirtualizer,
  rowVirtualizer,
  columnCount,
  cardWidth,
  rowHeight,
  iconSize,
  query,
  setSelected,
  loadDir,
}: Props) {
  return (
    <>
      {viewMode === "details" && (
        <section className="bg-light border-bottom fw-semibold px-3 py-2">
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
                        className="mt-2 text-break overflow-hidden"
                        style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {highlightText(item.name, query)}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <section ref={parentRef} className="flex-grow-1 overflow-auto bg-white">
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
                          {highlightText(item.name, query)}
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
                        {highlightText(item.name, query)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
