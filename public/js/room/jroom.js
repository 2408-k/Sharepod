var coll = document.getElementsByClassName("breakrow");
var i;

for (i = 0; i < coll.length; i++) {
  coll[i].addEventListener("click", function() {
    this.classList.toggle("active");
    var content = this.nextElementSibling;
    if (content.style.display === "table-row") {
      content.style.display = "none";
      $( this ).find(".down").attr("src", "/images/room/down.png");
    } else {
      content.style.display = "table-row";
    $( this).find(".down").attr("src", "/images/room/up.png");
    }
  });
}