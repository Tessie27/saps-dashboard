// Statistics South Africa, P0341 -- Victims of Crime Survey / GPSJS 2025/26
export const GENDER = {
  years: ['2018/19','2019/20','2020/21','2021/22','2022/23','2023/24','2024/25','2025/26'],
  crimes: {
    'Housebreaking (household)': { male:[608,540,404,562,667,719,708,632], female:[360,351,580,421,411,415,415,446] },
    'Home robbery (household)': { male:[101,76,70,105,128,114,124,104], female:[82,63,68,50,67,94,89,75] },
    'Assault (household)': { male:[56,25,39,52,34,72,65,86], female:[49,17,61,47,34,57,58,35] },
    'Theft of motor vehicle (household)': { male:[54,61,20,28,56,59,48,41], female:[14,21,18,14,16,28,14,20] },
    'Theft of personal property (individual)': { male:[521,447,346,530,646,715,647,623], female:[494,454,386,575,582,609,513,531] },
    'Street robbery (individual)': { male:[303,244,184.5,93,null,272,312,286], female:[149,208,127.7,152,null,172,157,173] },
    'Psychological violence (individual)': { male:[null,null,null,null,107,111,131,101], female:[null,null,null,null,158,204,207,163] },
    'Consumer fraud (individual)': { male:[33,200,173,162,179,180,262,145], female:[48,185,148,214,134,187,303,179] },
    'Assault (individual)': { male:[165,154,null,null,162,194,217,293], female:[116,70,null,null,100,101,145,115] }
  },
  gap: {
    labels: ['Housebreaking','Individual assault','Street robbery','Personal theft','Psychological violence','Household assault','Consumer fraud','Home robbery','Motor vehicle theft'],
    male:   [632, 293, 286, 623, 101, 86, 145, 104, 41],
    female: [446, 115, 173, 531, 163, 35, 179, 75, 20]
  },
  safety: {
    years: ['2021/22','2022/23','2023/24','2024/25','2025/26'],
    male:   [44.0, 37.3, 45.7, 39.5, 38.8],
    female: [43.9, 42.0, 39.8, 44.9, 45.1]
  }
};
