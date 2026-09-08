// 생일로 보는 인생주기 — 타로 메이저 아르카나(0~22) 계산 로직.
// data/Taro-LifeGraph.xlsx에서 역산: 나이 N세의 "총합" = (출생연도+N) + 출생월 + 출생일.
// 총합이 22를 넘으면 각 자릿수를 더하는 것을 22 이하가 될 때까지 반복한다.
// (20/21/22는 자릿수를 더하면 오히려 커지므로 그대로 유지 — 실제로도 이미 22 이하라 반복이 멈춘다)

const digitSum = (n: number): number =>
  String(n)
    .split('')
    .reduce((sum, digit) => sum + Number(digit), 0)

export const calculateLifeCycleCard = (birthYear: number, birthMonth: number, birthDay: number, age: number): number => {
  let total = birthYear + age + birthMonth + birthDay
  while (total > 22) {
    total = digitSum(total)
  }
  return total
}

export const MAX_LIFE_CYCLE_AGE = 99

// age 0..MAX_LIFE_CYCLE_AGE 전체를 미리 계산해 배열로 반환 (인덱스 = 나이)
export const calculateFullLifeCycle = (birthYear: number, birthMonth: number, birthDay: number): number[] =>
  Array.from({ length: MAX_LIFE_CYCLE_AGE + 1 }, (_, age) => calculateLifeCycleCard(birthYear, birthMonth, birthDay, age))

// 생년월일 기준 만 나이 계산 (오늘 날짜 기준)
export const calculateCurrentAge = (birthYear: number, birthMonth: number, birthDay: number): number => {
  const today = new Date()
  let age = today.getFullYear() - birthYear
  const hasHadBirthdayThisYear =
    today.getMonth() + 1 > birthMonth || (today.getMonth() + 1 === birthMonth && today.getDate() >= birthDay)
  if (!hasHadBirthdayThisYear) age -= 1
  return Math.max(0, Math.min(MAX_LIFE_CYCLE_AGE, age))
}
