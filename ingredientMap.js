// ingredientMap.js
const INGREDIENT_MAP = {
  // English -> Thai
  "chicken": "ไก่",
  "pork": "หมู",
  "beef": "เนื้อวัว",
  "shrimp": "กุ้ง",
  "prawn": "กุ้ง",
  "fish": "ปลา",
  "egg": "ไข่",
  "eggs": "ไข่",
  "fish sauce": "น้ำปลา",
  "chili": "พริก",
  "chilli": "พริก",
  "garlic": "กระเทียม",
  "basil": "กะเพรา",
  "lime": "มะนาว",
  "lemon": "มะนาว",
  "onion": "หอมใหญ่",
  "shallot": "หอมแดง",
  "oil": "น้ำมันพืช",
  "vegetable oil": "น้ำมันพืช",
  "sugar": "น้ำตาล",
  "salt": "เกลือ",
  "pork belly": "หมูกรอบ",
  "kale": "คะน้า",
  "chinese kale": "คะน้า",
  "tofu": "เต้าหู้",
  "mushroom": "เห็ด",

  // Thai -> English (เพื่อดึงรูปจาก TheMealDB)
  "ไก่": "chicken",
  "หมู": "pork",
  "เนื้อวัว": "beef",
  "กุ้ง": "shrimp",
  "ปลา": "fish",
  "ไข่": "egg",
  "น้ำปลา": "fish sauce",
  "พริก": "chili",
  "กระเทียม": "garlic",
  "กะเพรา": "basil",
  "มะนาว": "lime",
  "หอมใหญ่": "onion",
  "หอมแดง": "shallot",
  "น้ำมันพืช": "oil",
  "น้ำตาล": "sugar",
  "เกลือ": "salt",
  "หมูกรอบ": "pork belly",
  "คะน้า": "kale",
  "เต้าหู้": "tofu",
  "เห็ด": "mushroom"
};

// แปลงคำค้นหาเป็นภาษาไทย (เพื่อเช็คกับ thaimeals.js)
window.toThaiIngredient = function(name) {
  if (!name) return "";
  const clean = name.trim().toLowerCase();
  return INGREDIENT_MAP[clean] || name;
};

// แปลงเป็นชื่อภาษาอังกฤษเพื่อดึงรูปภาพ
// แปลงเป็นชื่อภาษาอังกฤษเพื่อดึงรูปภาพ
window.getIngredientImageUrl = function(name) {
  if (!name) return "https://cdn-icons-png.flaticon.com/512/1046/1046857.png";
  
  let clean = name.trim().toLowerCase();
  let engName = INGREDIENT_MAP[clean] || clean;
  
  // แปลงพหูพจน์กลับเป็นเอกพจน์สำหรับคำทั่วไป
  if (engName.endsWith("s") && !["chili", "basil", "fish sauce"].includes(engName)) {
    if (engName === "chillies") engName = "chili";
    else if (engName === "onions") engName = "onion";
    else if (engName === "eggs") engName = "egg";
    else if (engName === "prawns") engName = "prawn";
  }

  // ปรับอักษรตัวแรกให้เป็นตัวพิมพ์ใหญ่ (Capitalize)
  const formattedName = engName.charAt(0).toUpperCase() + engName.slice(1);
  
  return `https://www.themealdb.com/images/ingredients/${encodeURIComponent(formattedName)}.png`;
};