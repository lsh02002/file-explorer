import { SortKey, ViewMode } from "./Type";

type Props = {
  currentPath: string;
  query: string;
  sortKey: SortKey;
  viewMode: ViewMode;

  loading: boolean;
  visibleCount: number;
  totalCount: number;

  setQuery: (value: string) => void;
  setSortKey: (value: SortKey) => void;
  setViewMode: (value: ViewMode) => void;
};

export default function ExplorerControls({
  currentPath,
  query,
  sortKey,
  viewMode,
  loading,
  visibleCount,
  totalCount,
  setQuery,
  setSortKey,
  setViewMode,
}: Props) {
  return (
    <>
      <section className="px-3 py-2 bg-body-tertiary border-bottom">
        <strong>현재:</strong> <span>{currentPath || "폴더를 선택하세요"}</span>
      </section>

      <section className="d-flex gap-2 align-items-center p-2 bg-white border-bottom">
        <input
          className="form-control"
          placeholder="현재 폴더에서 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </section>

      <section className="d-flex gap-2 align-items-center p-2 bg-white border-bottom">
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

        <span className="text-secondary">
          {loading
            ? "로딩 중..."
            : `${visibleCount.toLocaleString()}개 표시 / ${totalCount.toLocaleString()}개 전체`}
        </span>
      </section>
    </>
  );
}
