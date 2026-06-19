type Props = {
  currentPath: string;
  selected: boolean;

  goParent: () => void;
  refresh: () => void;
  create: (kind: "file" | "dir") => void;
  renameSelected: () => void;
  deleteSelected: () => void;
};

export default function Toolbar({
  currentPath,
  selected,
  goParent,
  refresh,
  create,
  renameSelected,
  deleteSelected,
}: Props) {
  return (
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
  );
}
