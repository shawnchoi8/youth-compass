-- 초기 사용자 데이터 (User-Id: 1로 테스트용)
-- JWT 인증 구현 전까지 사용

-- 기존 데이터가 있으면 건너뛰기
INSERT INTO users (user_id, user_login_id, user_password, user_name, user_residence, user_age, user_salary, user_assets, user_agree_privacy, user_created_at, user_updated_at)
SELECT 1, 'test', 'password', '테스트 사용자', '서울', 25, 3000.00, 5000.00, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM users WHERE user_id = 1);
