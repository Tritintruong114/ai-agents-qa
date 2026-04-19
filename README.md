# ai-agents-qa

PoC **gatekeeper** cho ngữ cảnh SEC 17a-4: backend **FastAPI** (đánh giá + SSE), frontend **Next.js** (golden dataset, ổn định N×, pitch deck). Chi tiết kỹ thuật ngắn: [docs/A2A_OVERVIEW.md](docs/A2A_OVERVIEW.md).

## Yêu cầu hệ thống

- **Node.js** 20+ và **npm** (khuyến nghị dùng [nvm](https://github.com/nvm-sh/nvm) hoặc tương đương).
- **Python** 3.11+ (3.12/3.14 đã được dùng trong môi trường phát triển).
- Tài khoản **OpenAI** và API key (mô hình được cấu hình trong code, mặc định `gpt-4o-mini`).

## Cấu trúc thư mục


| Thư mục / file | Vai trò                                                                                 |
| -------------- | --------------------------------------------------------------------------------------- |
| `backend/`     | API FastAPI, SQLite `knowledge_base.db`, judge Pydantic AI + readability                |
| `frontend/`    | Ứng dụng Next.js (App Router), gọi API qua `lib/constants.ts` → `http://localhost:8000` |
| `docs/`        | Handoff, nội dung pitch deck                                                            |


## Cài đặt

### 1. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Tạo file `**backend/.env**`:

```env
OPENAI_API_KEY=sk-...
```

### 2. Frontend

```bash
cd frontend
npm install
```

## Chạy local

Cần **hai terminal** (backend trước, hoặc chạy song song).

**Terminal 1 — API (cổng 8000):**

```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload
```

**Terminal 2 — UI (cổng 3000):**

```bash
cd frontend
npm run dev
```

Mở trình duyệt: **[http://localhost:3000](http://localhost:3000)**. Trên **header** của app có liên kết đầy đủ tới tài liệu API do FastAPI tự sinh (cùng base `API_BASE` trong `frontend/lib/constants.ts`):

- [http://localhost:8000/docs](http://localhost:8000/docs) (Swagger UI)
- [http://localhost:8000/redoc](http://localhost:8000/redoc) (ReDoc)
- [http://localhost:8000/openapi.json](http://localhost:8000/openapi.json) (OpenAPI schema)

Nếu UI không gọi được API, kiểm tra CORS (backend cho phép origin dev) và biến `API_BASE` trong `frontend/lib/constants.ts`.

## Kiểm tra nhanh sau khi chạy

1. **API:** `curl -s http://localhost:8000/api/system-prompt | head` — phải trả JSON có `system_prompt`.
2. **UI:** Chuyển sang **Live Demo**, chọn một case trong golden dataset, bấm chạy đánh giá — SSE phải stream và có kết quả cuối (cần `OPENAI_API_KEY` hợp lệ).
3. **Pitch Deck:** Tab/header tương ứng để xem slide (nội dung đồng bộ với [docs/PITCH_DECK_CONTENT.md](docs/PITCH_DECK_CONTENT.md)).

## Kiểm tra / chất lượng mã (toàn repo)

Chạy từ máy clone sau khi đã `npm install` ở `frontend/`:

```bash
# Frontend: lint + build (build đã gồm kiểm tra TypeScript)
cd frontend
npm run lint
npm run build
```

Repo **không** có bộ test tự động riêng cho Python; để xác nhận backend import được:

```bash
cd backend
source venv/bin/activate
python -c "import main; print('backend import OK')"
```

Để kiểm tra cú pháp nhanh các file nguồn backend (không gồm `venv`):

```bash
cd backend
python -m compileall -q main.py contracts.py database.py readability.py && echo "compileall OK"
```

## Gợi ý xử lý sự cố


| Hiện tượng                       | Hướng xử lý                                                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Lỗi OpenAI / 401                 | Kiểm tra `OPENAI_API_KEY` trong `backend/.env`, restart `uvicorn`.                                                        |
| Dữ liệu seed cũ                  | Xóa `backend/knowledge_base.db` rồi chạy lại API (bảng test sẽ seed lại khi trống).                                       |
| Prompt judge lệch sau khi deploy | Xóa key `localStorage` `ai-agents-qa.system-prompt.v1` trên trình duyệt hoặc dùng **Reset** trong tab Prompt Engineering. |


## Tài liệu thêm

- [docs/README.md](docs/README.md) — mục lục tài liệu trong repo.

