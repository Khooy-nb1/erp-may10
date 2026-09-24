# Mọi người xem cách dùng GIT tại đây
# Git Commands

## 1. Kiểm tra trạng thái

```bash
git status
```

→ Kiểm tra file đã thay đổi.

## 2. Xem branch

```bash
git branch
```

→ Xem các branch local.

```bash
git branch -a
```

→ Xem branch local + remote.

## 3. Chuyển branch

```bash
git switch main
```

→ Chuyển sang `main`.

```bash
git switch develop
```

→ Chuyển sang `develop`.

## 4. Tạo branch mới

```bash
git switch -c feature/ten-chuc-nang
```

→ Tạo và chuyển sang branch mới.

## 5. Cập nhật code

```bash
git pull origin develop
```

→ Lấy code mới nhất từ `develop`.

```bash
git fetch origin
```

→ Lấy thông tin mới từ remote.

## 6. Thêm code

```bash
git add .
```

→ Đưa tất cả thay đổi vào staging.

## 7. Commit

```bash
git commit -m "feat: mo ta chuc nang"
```

→ Lưu thay đổi vào Git.

## 8. Push

```bash
git push -u origin feature/ten-chuc-nang
```

→ Đẩy branch lên GitHub/GitLab.

Lần sau:

```bash
git push
```

## 9. Merge

```bash
git switch develop
git pull origin develop
git merge feature/ten-chuc-nang
git push origin develop
```

→ Merge branch chức năng vào `develop`.

## 10. Merge develop → main

```bash
git switch main
git pull origin main
git merge develop
git push origin main
```

→ Đưa code đã hoàn thiện từ `develop` vào `main`.

## 11. Xem lịch sử

```bash
git log --oneline
```

→ Xem lịch sử commit.

## 12. Hủy thay đổi chưa commit

```bash
git restore .
```

→ Hủy toàn bộ thay đổi chưa commit.

## 13. Xử lý conflict

```bash
git status
```

```bash
git add .
git commit -m "fix: resolve conflict"
```

→ Kiểm tra và hoàn tất xử lý conflict.

## 14. Hủy merge

```bash
git merge --abort
```

→ Hủy merge đang xảy ra.

---

# Quy trình làm việc

```bash
git switch develop
git pull origin develop
git switch -c feature/ten-chuc-nang

# Code...

git add .
git commit -m "feat: mo ta chuc nang"
git push -u origin feature/ten-chuc-nang
```

Sau đó tạo **Pull Request:**

```text
feature/ten-chuc-nang → develop
```

Khi hoàn thiện:

```text
develop → main
```
