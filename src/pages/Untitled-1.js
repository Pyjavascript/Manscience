//TODO JS App

let todo = [];

function createTodo(task) {
  todo.push({
    id: todo.length + 1,
    task,
    done: false,
  });
}

function updateTodo(updatedTask, id) {
  let updt = todo.find((e) => e.id == id);
  if (updt) updt.task = updatedTask;
}

function completeTodo(id) {
  let completeTask = todo.find((e) => e.id == id);
  if (completeTask) completeTask.done = true;
}
function deleteTodo(id) {
  todo = todo.filter((e) => e.id !== id);
  todo.forEach((e, i) => {
    e.id = i + 1;
  });
}

function seeTodo() {
  todo.forEach((e, i) => {
    console.log(`${e.id + "."} ${e.done ? "[x] " : "[] "} ${e.task} \n`);
  });
}

createTodo("Learn React");
createTodo("Work on Manasi Ai");
createTodo("Give time to yourself");

updateTodo("Learn React + tailwind", 1);
completeTodo(1);

deleteTodo(1);
// seeTodo();

//Student Grade Tracker

let students = [
  { name: "Aman", marks: [80, 90, 75] },
  { name: "Priya", marks: [95, 85, 92] },
  { name: "Raj", marks: [60, 55, 70] },
];

function getAvg(marks) {
  return Number(
    (marks.reduce((sum, m) => sum + m, 0) / marks.length).toFixed(2),
  );
}

function getGrade(avg) {
  return avg >= 90 ? "A" : avg >= 75 ? "B" : avg >= 60 ? "C" : "F";
}

students.forEach((e, i) => {
  let avg = getAvg(e.marks);
  // console.log(`{Name: ${e.name}, Average: ${avg} , Grade: ${getGrade(avg)} }`);
});



// Shopping Cart Logic

let cart = [];

let LOI = [
  {
    name: "Bread",
    price: "45",
    category: "Meal",
    qty: 1,
  },
  {
    name: "Butter",
    price: "70",
    category: "Dairy",
    qty: 1,
  },
  {
    name: "Watermelon",
    price: "80",
    category: "fruit",
    qty: 1,
  },
  {
    name: "Notebook",
    price: "80",
    category: "study",
    qty: 1,
  },
];

function showItems() {
  // LOI.forEach((e,i) => {
  //     console.log(`Product: ${e.name}, $:${e.price}`)
  // })
}
showItems();

function addItems(...items) {
  items.forEach((e, i) => {
    let item = LOI.find((i) => i.name.toLowerCase() == e.toLowerCase());

    cart.push(item);
  });
}
function showCart() {
  cart.forEach((e, i) => {
    console.log(e);
  });
}
function removeItems(...items) {
  items.forEach((e, i) => {
    // let item = cart.find((i) => i.name.toLowerCase() == e.toLowerCase());
    cart = cart.filter((e) => e.name !== e.name);
  });
}

addItems("watermelon", "Butter");
removeItems("butter");
showCart();
