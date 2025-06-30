# 🚀 Final Performance Challenge: Message Processing Optimization

## 📋 Problem Description

당신은 MinitalkChat 애플리케이션의 백엔드 개발자입니다.
곧 12월 31일이 다가오는데, 새해 인사를 보내는 사용자가 많아질 것을 대비해 대량의 메시지가 발생할 것을 대비해 성능 최적화를 해야합니다.

## 🎯 과제 목표

1. **현재 문제 확인**: 대량 메시지 부하 테스트로 성능 이슈 확인
2. **백엔드 최적화**: 메시지 처리 성능 개선
3. **개선 효과 검증**: 프론트엔드에서 메시지 전송이 정상 동작하는지 확인

## 📊 Step 1: 현재 성능 확인

### 대량 메시지 부하 테스트 실행
```bash
kubectl exec -it minitalk-loadtest-7fdc87d54-45sqp -n jonny -- python new_year_load_test.py
```
minitalk-loadtest 이후의 식별코드가 변경될 가능성이 있으므로, tab으로 자동완성.

주의: 이번 EKS 환경의 성능이 그렇게 좋지는 않아서, 실제보다는 더 낮은 수치로 부하 테스트를 진행합니다.
부하 테스트는 1. Quick Bombing 만 실행하세요.

### 프론트엔드에서 확인
1. 브라우저에서 MinitalkChat 접속
2. 채팅방에서 메시지 전송 시도
3. **문제 확인**: 메시지가 지연되거나 전송되지 않는 현상 관찰

## 🔧 Step 2: 백엔드 최적화

### 최적화 목표
- 메시지 전송 실패 방지
- 메시지 전송 지연 감소

### 제약 조건
- 프론트엔드 수정 금지
- 데이터 무결성 보장
- 기존 기능 정상 동작

## ✅ Step 3: 개선 효과 검증

### 대량 메시지 부하 테스트 재실행
```bash
kubectl exec -it minitalk-loadtest-7fdc87d54-45sqp -n jonny -- python new_year_load_test.py
```

### 프론트엔드 재확인
1. 브라우저에서 MinitalkChat 접속
2. 채팅방에서 메시지 전송 시도
3. **개선 확인**: 메시지가 정상적으로 전송되는지 확인

## ✅ 완료 기준

- [ ] 대량 메시지 부하 테스트로 현재 성능 이슈 확인
- [ ] 백엔드 최적화 구현
- [ ] 대량 메시지 부하 테스트에서 개선 효과 확인
- [ ] 프론트엔드에서 메시지 전송 정상 동작 확인

**Good Luck! 🚀** 
