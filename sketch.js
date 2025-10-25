let fontRegular;
let playButton, resetButton, instructionsButton, overlapButton, sphereButton, labelButton, spinButton;
let titleDiv, footerDiv, instructionsPopup;
let atoms = [];
let state = "idle";
let progress = 0;
let bondingProgress = 0;
let cloudRotationAngle = 0;

// Tốc độ bây giờ là rad/giây (nhân với deltaTime để có rad/frame)
const slowSpinSpeed = 0.6;      // rad/giây (lớp trong quay chậm)
const fastSpinSpeed = 8.0;      // rad/giây (lớp xen phủ quay nhanh liên tục)
const sphereRotationSpeed = 1.5; // rad/giây (mặt cầu)

let clSphereRotation1 = 0;
let clSphereRotation2 = 0;

const clOuterRadius = 50 + 2 * 40;
const initialShellGap = 200;
const bondedShellOverlap = 24; // Khoảng cách liên kết đã được điều chỉnh
const bondDistance = (clOuterRadius * 2) - bondedShellOverlap;
const sharedElectronSeparation = 12;

const initialDistance = clOuterRadius + initialShellGap + clOuterRadius;

let panX = 0;
let panY = 0;

// Đã sửa: Nhãn được bật mặc định từ đầu
let labelEnabled = true; // Biến trạng thái cho nhãn
let showSpheres = false; // Thêm biến mới để điều khiển việc hiển thị lớp cầu
let showOverlap = false; // Thêm biến mới để điều khiển việc hiển thị lớp xen phủ
let electronSpinEnabled = true; // Thêm biến mới để kiểm soát việc quay electron

function preload() {
  fontRegular = loadFont('https://fonts.gstatic.com/s/opensans/v27/mem8YaGs126MiZpBA-UFVZ0e.ttf');
}

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  frameRate(60); // Cố định tốc độ khung hình mong muốn
  background(0);
  perspective(PI / 3, width / height, 0.1, 4000);

  smooth();
  textFont(fontRegular);
  textAlign(CENTER, CENTER);
  noStroke();

  titleDiv = createDiv("MÔ PHỎNG LIÊN KẾT CỘNG HOÁ TRỊ TRONG PHÂN TỬ Cl₂");
  titleDiv.style("position", "absolute");
  titleDiv.style("top", "10px");
  titleDiv.style("width", "100%");
  titleDiv.style("text-align", "center");
  titleDiv.style("font-size", "18px");
  titleDiv.style("color", "#fff");
  titleDiv.style("text-shadow", "2px 2px 5px rgba(0,0,0,0.7)");
  titleDiv.style("font-family", "Arial");

  footerDiv = createDiv("© HÓA HỌC ABC");
  footerDiv.style("position", "absolute");
  footerDiv.style("bottom", "10px");
  footerDiv.style("width", "100%");
  footerDiv.style("text-align", "center");
  footerDiv.style("font-size", "16px");
  footerDiv.style("color", "#fff");
  footerDiv.style("text-shadow", "2px 2px 5px rgba(0,0,0,0.7)");
  footerDiv.style("font-family", "Arial");

  createUI();
  resetSimulation();
}

function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function createUI() {
  playButton = createButton("▶ Play");
  styleButton(playButton);
  playButton.mousePressed(() => {
    if (state === "idle") {
      state = "animating";
    } else if (state === "done" || showSpheres || showOverlap) {
      resetSimulation();
      state = "animating";
    }
    showSpheres = false;
    showOverlap = false;
    sphereButton.html("Bật lớp cầu");
    overlapButton.html("Bật xen phủ");
  });

  // Thêm nút mới cho chức năng quay electron
  spinButton = createButton("Tắt quay electron");
  styleButton(spinButton);
  spinButton.mousePressed(() => {
    electronSpinEnabled = !electronSpinEnabled;
    spinButton.html(electronSpinEnabled ? "Tắt quay electron" : "Bật quay electron");
  });

  resetButton = createButton("↺ Reset");
  styleButton(resetButton);
  resetButton.mousePressed(() => {
    // Sửa đổi tại đây: Tải lại trang web để reset hoàn toàn
    window.location.reload(); 
  });

  overlapButton = createButton("Bật xen phủ");
  styleButton(overlapButton);
  overlapButton.mousePressed(() => {
    // Chỉ cho phép nút hoạt động khi trạng thái là "done"
    if (state === "done" || showOverlap) {
      showOverlap = !showOverlap;
      if (showOverlap) {
        showSpheres = false;
        overlapButton.html("Tắt xen phủ");
        sphereButton.html("Bật lớp cầu");
      } else {
        overlapButton.html("Bật xen phủ");
      }
    }
  });

  sphereButton = createButton("Bật lớp cầu");
  styleButton(sphereButton);
  sphereButton.mousePressed(() => {
    showSpheres = !showSpheres;
    if (showSpheres) {
      // Khi bật lớp cầu: tắt chế độ xen phủ và chuyển sang giao diện mặt cầu
      showOverlap = false;
      sphereButton.html("Tắt lớp cầu");
      overlapButton.html("Bật xen phủ");
      // Lưu ý: tắt "các nguồn sáng cố định" sẽ được xử lý trong draw() —
      // khi showSpheres === true thì draw() sẽ không bật pointLight cố định nữa.
    } else {
      // Khi tắt mặt cầu: phục hồi các nguồn sáng cố định trong draw()
      sphereButton.html("Bật lớp cầu");
    }
  });

  labelButton = createButton("Bật nhãn");
  styleButton(labelButton);
  labelButton.mousePressed(() => {
    labelEnabled = !labelEnabled;
    if (labelEnabled) {
      labelButton.html("Tắt nhãn");
    } else {
      labelButton.html("Bật nhãn");
    }
  });

  instructionsButton = createButton("Hướng dẫn");
  styleButton(instructionsButton, true);
  instructionsButton.mousePressed(() => {
    instructionsPopup.style('display', 'block');
  });

  instructionsPopup = createDiv();
  instructionsPopup.id('instructions-popup');
  instructionsPopup.style('position', 'fixed');
  instructionsPopup.style('top', '50%');
  instructionsPopup.style('left', '50%');
  instructionsPopup.style('transform', 'translate(-50%, -50%)');
  instructionsPopup.style('background-color', 'rgba(0, 0, 0, 0.85)');
  instructionsPopup.style('border-radius', '12px');
  instructionsPopup.style('padding', '20px');
  instructionsPopup.style('color', '#fff');
  instructionsPopup.style('font-family', 'Arial');
  instructionsPopup.style('z-index', '1000');
  instructionsPopup.style('box-shadow', '0 4px 8px rgba(0, 0, 0, 0.2)');
  instructionsPopup.style('display', 'none');

  let popupContent = `
    <h2 style="font-size: 24px; margin-bottom: 15px; text-align: center;">Hướng dẫn sử dụng</h2>
    <ul style="list-style-type: none; padding: 0;">
      <li style="margin-bottom: 10px;">• Nhấn nút "Play" để bắt đầu quá trình mô phỏng liên kết cộng hóa trị.</li>
      <li style="margin-bottom: 10px;">• Sau khi mô phỏng hoàn tất, bạn có thể sử dụng chuột để xoay và xem mô hình từ các góc khác nhau.</li>
      <li style="margin-bottom: 10px;">• Giữ phím **Ctrl** và kéo chuột trái để di chuyển toàn bộ mô hình trên màn hình.</li>
      <li style="margin-bottom: 10px;">• Sử dụng con lăn chuột để phóng to hoặc thu nhỏ.</li>
      <li style="margin-bottom: 10px;">• Nhấn nút "Reset" để quay lại trạng thái ban đầu.</li>
      <li style="margin-bottom: 10px;">• Nhấn nút "Bật xen phủ" để hiển thị đám mây electron liên kết.</li>
      <li style="margin-bottom: 10px;">• Nhấn nút "Bật lớp cầu" để hiển thị lớp electron hóa trị dưới dạng mặt cầu.</li>
      <li style="margin-bottom: 10px;">• Nhấn nút "Bật nhãn" để hiển thị nhãn tên nguyên tố "Cl".</li>
      <li style="margin-bottom: 10px;">• Nhấn nút "Bật/Tắt quay electron" để dừng hoặc tiếp tục chuyển động quay của các electron.</li>
    </ul>
    <button id="closePopup" style="display: block; width: 100%; padding: 10px; margin-top: 20px; font-size: 16px; border: none; border-radius: 6px; background-color: #36d1dc; color: #fff; cursor: pointer;">Đóng</button>
  `;
  instructionsPopup.html(popupContent);

  setTimeout(() => {
    const closeBtn = document.getElementById('closePopup');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        instructionsPopup.style('display', 'none');
      });
    }
  }, 0);

  positionButtons();
}

function styleButton(btn, isTransparent = false) {
  // Thay đổi ở đây: Đặt chiều rộng cố định cho tất cả các nút
  btn.style("width", "140px"); 
  btn.style("height", "30px");
  btn.style("padding", "0px");
  btn.style("font-size", "12px");
  btn.style("border-radius", "6px");
  btn.style("color", "#fff");
  btn.style("cursor", "pointer");
  btn.style("transition", "all 0.2s ease-in-out");
  btn.style("font-family", "Arial");
  btn.style("transform", "scale(1)");

  if (isTransparent) {
    btn.style("background", "rgba(0,0,0,0)");
    btn.style("border", "1px solid #fff");
    btn.style("box-shadow", "none");
  } else {
    btn.style("border", "none");
    btn.style("background", "linear-gradient(145deg, #6a82fb, #fc5c7d)");
    btn.style("box-shadow", "3px 3px 6px rgba(0,0,0,0.4)");

    btn.mouseOver(() => {
      btn.style("background", "linear-gradient(145deg, #fc5c7d, #6a82fb)");
    });
    btn.mouseOut(() => {
      btn.style("background", "linear-gradient(145deg, #6a82fb, #fc5c7d)");
    });
    btn.mousePressed(() => {
      btn.style("background", "linear-gradient(145deg, #8a2be2, #00ffff)");
    });
    btn.mouseReleased(() => {
      btn.style("background", "linear-gradient(145deg, #6a82fb, #fc5c7d)");
    });
  }
}

function positionButtons() {
  playButton.position(20, 20);
  // Cập nhật vị trí các nút để giữ khoảng cách đều
  spinButton.position(20, 55);
  overlapButton.position(20, 90);
  sphereButton.position(20, 125);
  labelButton.position(20, 160);
  resetButton.position(20, 195);
  instructionsButton.position(20, 230);
}

function resetSimulation() {
  atoms = [];

  atoms.push(new Atom(-initialDistance / 2, 0, "Cl", 17, [2, 8, 7], color(255, 150, 0)));
  atoms.push(new Atom(initialDistance / 2, 0, "Cl", 17, [2, 8, 7], color(0, 255, 0)));

  state = "idle";
  progress = 0;
  bondingProgress = 0;
  cloudRotationAngle = 0;
  clSphereRotation1 = 0;
  clSphereRotation2 = 0;
  panX = 0;
  panY = 0;
  overlapButton.html("Bật xen phủ");
  sphereButton.html("Bật lớp cầu");
  // Đã sửa: Bật nhãn mặc định khi reset
  labelEnabled = true;
  labelButton.html("Tắt nhãn");
  showSpheres = false;
  showOverlap = false;
  // Bật quay electron mặc định khi reset
  electronSpinEnabled = true;
  spinButton.html("Tắt quay electron");
}

function drawBillboardText(textStr, x, y, z, size) {
  push();
  translate(x, y, z);
  textSize(size);
  text(textStr, 0, 0);
  pop();
}

function draw() {
  // deltaTime (ms) dùng để điều chỉnh chuyển động theo thời gian thực
  const dt = deltaTime / 1000.0; // giây

  background(0);

  if (keyIsDown(17) && mouseIsPressed) {
    panX += (mouseX - pmouseX);
    panY += (mouseY - pmouseY);
  } else {
    orbitControl();
  }

  translate(panX, panY);

  // IMPORTANT: Khi showSpheres === true, ta tắt "các nguồn sáng cố định" (ambient + point light cố định)
  // và chuyển sang hệ thống ánh sáng động bên trong drawElectronSpheres() (ambient + 2 directional lights di chuyển).
  // Khi showSpheres === false thì bật lại các nguồn sáng cố định (ambient + pointLight).
  if (!showSpheres) {
    // fixed ambient + fixed point light for regular view (restored when sphere view off)
    // Tăng sáng ambient để các vật thể rõ hơn
    ambientLight(160);
    // pointLight màu trắng ở phía trước (giữ mức max màu), giữ vị trí gần hơn để highlight rõ hơn
    pointLight(255, 255, 255, 0, 0, 300);
  } else {
    // Do nothing here: drawElectronSpheres() will establish its ambient + moving directional lights.
    // Avoid creating additional fixed point lights so highlights come only from the moving directional lights.
  }

  if (state === "animating") {
    progress += 0.01;
    let t_move = easeInOutQuad(progress);
    let currentDist = lerp(initialDistance, bondDistance, t_move);

    if (progress >= 1) {
      progress = 1;
      state = "bonding";
    }

    atoms[0].pos.x = -currentDist / 2;
    atoms[1].pos.x = currentDist / 2;
  } else if (state === "bonding") {
    bondingProgress += 0.02;
    if (bondingProgress >= 1) {
      bondingProgress = 1;
      state = "done";
    }
    atoms[0].pos.x = -bondDistance / 2;
    atoms[1].pos.x = bondDistance / 2;
  } else if (state === "done") {
    atoms[0].pos.x = -bondDistance / 2;
    atoms[1].pos.x = bondDistance / 2;
  } else if (state === "idle") {
    atoms[0].pos.x = -initialDistance / 2;
    atoms[1].pos.x = initialDistance / 2;
  }

  for (let atom of atoms) {
    push();
    translate(atom.pos.x, atom.pos.y, 0);
    // Chỉ truyền dt để xoay electron khi electronSpinEnabled là true
    atom.show(electronSpinEnabled ? dt : 0);
    pop();
  }
  
  if (showOverlap) {
    // tăng góc theo rad/giây nhân dt -> mượt và độc lập FPS
    cloudRotationAngle += fastSpinSpeed * dt;
    // giữ góc trong phạm vi [0, TWO_PI)
    cloudRotationAngle = cloudRotationAngle % TWO_PI;
    drawElectronClouds();
  }
  
  if (showSpheres) {
    clSphereRotation1 += sphereRotationSpeed * dt;
    clSphereRotation2 -= sphereRotationSpeed * dt; // Đã đảo chiều quay của mặt cầu thứ hai
    clSphereRotation1 = clSphereRotation1 % TWO_PI;
    clSphereRotation2 = clSphereRotation2 % TWO_PI;
    drawElectronSpheres();
  }
}

function drawElectronClouds() {
  const outerRadius = atoms[0].shellRadii[2];
  const cloudWidth = 18;

  // Giảm đường kính lớp xen phủ một chút (độ dày giữ nguyên)
  // cloudInset là khoảng rút vào từ bán kính vỏ ngoài để giảm đường kính xen phủ
  const cloudInset = 8; // giảm 8 pixel (tùy chỉnh nếu muốn lớn/nhỏ hơn)
  const cloudOuterRadius = max(4, outerRadius - cloudInset);

  let blendedColor = lerpColor(color(255, 150, 0), color(0, 255, 0), 0.35);
  blendedColor.setAlpha(255);

  push();
  translate(atoms[0].pos.x, atoms[0].pos.y, 0);
  rotateZ(cloudRotationAngle);
  noStroke();
  fill(blendedColor);
  // Giữ kiểu gấp khúc: số segment thấp (12, 12) -> facet/khúc
  torus(cloudOuterRadius, cloudWidth, 12, 12);
  pop();

  push();
  translate(atoms[1].pos.x, atoms[1].pos.y, 0);
  rotateZ(cloudRotationAngle);
  noStroke();
  fill(blendedColor);
  torus(cloudOuterRadius, cloudWidth, 12, 12);
  pop();
}

// CẬP NHẬT: drawElectronSpheres sử dụng mô hình chiếu sáng tương tự File 1
// - ambientLight và 2 directional lights di chuyển (tạo highlight động)
// - Sử dụng ambientMaterial + specularMaterial để giữ màu nguyên của mặt cầu nhưng cho highlight
// - Đảm bảo shininess và chi tiết sphere cao (64) để bóng và highlight mượt
// Tăng cường độ ánh sáng ở đây để mặt cầu sáng hơn
function drawElectronSpheres() {
  // Slightly stronger ambient for sphere view (increased)
  ambientLight(140);

  // TWO MOVING DIRECTIONAL LIGHTS (positions move with frameCount to create dynamic highlights)
  let aA = frameCount * 0.010;
  let LAx = cos(aA) * 380;
  let LAy = sin(aA) * 240;
  // Light A: slower, wider orbit — increased intensity
  directionalLight(200, 200, 200, LAx, LAy, -0.25);

  let aB = frameCount * 0.018 + PI / 4;
  let LBx = cos(aB) * 210;
  let LBy = sin(aB) * 170;
  // Light B: faster, tighter orbit — increased intensity
  directionalLight(140, 140, 140, -LBx, -LBy, 0.2);

  // For each atom, render a sphere using material functions so color remains correct
  for (let i = 0; i < atoms.length; i++) {
    const atom = atoms[i];
    if (atom.shellRadii.length > 0) {
      push();
      translate(atom.pos.x, atom.pos.y, 0);
      noStroke();
      // Slightly higher shininess so highlights from moving lights are visible
      shininess(85);

      // Preserve the existing color of the sphere (atom.electronColor)
      const r = red(atom.electronColor);
      const g = green(atom.electronColor);
      const b = blue(atom.electronColor);

      ambientMaterial(r, g, b);
      // Make specular slightly brighter than base color for clearer highlights
      specularMaterial(min(255, r + 45), min(255, g + 45), min(255, b + 45));

      const clOrbitalRadius = clOuterRadius + 6;
      const sphereDetail = 64;  
      rotateY(i === 0 ? clSphereRotation1 : clSphereRotation2);
      sphere(clOrbitalRadius, sphereDetail, sphereDetail);
      pop();
    }
  }
}

class Atom {
  constructor(x, y, label, protons, shellCounts, electronCol) {
    this.pos = createVector(x, y, 0);
    this.label = label;
    this.protons = protons;
    this.shells = [];
    this.shellRadii = [];
    this.electronColor = electronCol; // <-- lưu màu electron để dùng cho mặt cầu
    let baseR = 50;
    let increment = 40;

    this.nonBondingPairAngles = [PI / 2, 3 * PI / 2, (x < 0) ? PI : 0];

    this.otherElectronCol = (electronCol.levels && electronCol.levels[0] === 255) ? color(0, 255, 0) : color(255, 150, 0);

    for (let i = 0; i < shellCounts.length; i++) {
      let radius = baseR + i * increment;
      this.shellRadii.push(radius);
      let shellElectrons = [];
      for (let j = 0; j < shellCounts[i]; j++) {
        shellElectrons.push({
          angle: (TWO_PI / shellCounts[i]) * j,
          col: electronCol,
          isShared: false
        });
      }
      this.shells.push(shellElectrons);
    }

    const outerShellIndex = this.shells.length - 1;
    const outerShell = this.shells[outerShellIndex];

    let sharedIndex = 0;
    if (this.pos.x < 0) {
      sharedIndex = outerShell.reduce((bestIndex, e, currentIndex) => {
        if (abs(e.angle - 0) < abs(outerShell[bestIndex].angle - 0)) {
          return currentIndex;
        }
        return bestIndex;
      }, 0);
    } else {
      sharedIndex = outerShell.reduce((bestIndex, e, currentIndex) => {
        if (abs(e.angle - PI) < abs(outerShell[bestIndex].angle - PI)) {
          return currentIndex;
        }
        return bestIndex;
      }, 0);
    }
    outerShell[sharedIndex].isShared = true;
  }

  // nhận dt (giây) để xoay electron mượt theo thời gian
  show(dt = 0) {
    push();
    fill(255, 0, 0);
    sphere(20);

    push();
    fill(255, 255, 0);
    textSize(16);
    let xOffset = 0;
    if (this.pos.x < 0) {
      xOffset = 7;
    } else {
      xOffset = -7;
    }
    translate(xOffset, 0, 21);
    text("+" + this.protons, 0, 0);
    pop();

    pop();

    for (let i = 0; i < this.shells.length; i++) {
      noFill();
      stroke(255);
      strokeWeight(1);

      let radius = this.shellRadii[i];
      let overlapDistance = 0;
      if (state === "bonding") {
        overlapDistance = lerp(0, bondedShellOverlap, easeInOutQuad(bondingProgress));
      } else if (state === "done" || state === "overlap_spinning" || state === "sphere_spinning") {
        overlapDistance = bondedShellOverlap;
      }

      push();
      // Đảm bảo đồng tâm với hạt nhân
      if (!showOverlap && !showSpheres || i < this.shells.length - 1) {
        drawSmoothCircle(radius);
      }
      pop();
    }
    noStroke();

    for (let i = 0; i < this.shells.length; i++) {
      let radius = this.shellRadii[i];
      const electronSize = 6;

      if (showOverlap && i === this.shells.length - 1) {
        continue;
      }
      if (showSpheres && i === this.shells.length - 1) {
        continue;
      }

      let nonSharedCount = 0;
      for (let j = 0; j < this.shells[i].length; j++) {
        let e = this.shells[i][j];
        let ex = 0, ey = 0;

        // Logic tốc độ quay: lớp 1 và 2 quay chậm, lớp xen phủ quay nhanh, lớp ngoài cùng (khi không xen phủ) cũng quay chậm
        if (i < 2 || (i === 2 && state !== "done" && state !== "bonding")) {
          // Chỉ xoay khi dt > 0
          e.angle += slowSpinSpeed * dt;
          e.angle = e.angle % TWO_PI;
          ex = cos(e.angle) * radius;
          ey = sin(e.angle) * radius;
        } else {
          // Chỉ sắp xếp lại electron lớp ngoài cùng
          if (i === this.shells.length - 1) {
            let t_bonding = easeInOutQuad(bondingProgress);

            let initialAngle = (TWO_PI / this.shells[i].length) * j;
            let initialX = cos(initialAngle) * radius;
            let initialY = sin(initialAngle) * radius;

            if (e.isShared) {
              let finalX = 0;
              let finalY = this.pos.x < 0 ? -sharedElectronSeparation : sharedElectronSeparation;
              ex = lerp(initialX, finalX - this.pos.x, t_bonding);
              ey = lerp(initialY, finalY, t_bonding);
            } else {
              const pairAngleOffset = radians(4);
              const pairIndex = floor(nonSharedCount / 2);
              const isSecondElectron = (nonSharedCount % 2) === 1;

              let finalAngle = this.nonBondingPairAngles[pairIndex];
              let currentAngle = finalAngle + (isSecondElectron ? -pairAngleOffset : pairAngleOffset);

              let finalX = cos(currentAngle) * radius;
              let finalY = sin(currentAngle) * radius;

              // Dịch chuyển cặp electron ngoài cùng bên trái sang trái 3px và bên phải sang phải 3px
              const horizontalShift = (this.pos.x < 0) ? -3 : 3;
              if (pairIndex === 2) {
                finalX += horizontalShift;
              }

              ex = lerp(initialX, finalX, t_bonding);
              ey = lerp(initialY, finalY, t_bonding);

              nonSharedCount++;
            }
          } else { // Lớp 1 và 2 vẫn quay như bình thường
            // Chỉ xoay khi dt > 0
            e.angle += slowSpinSpeed * dt;
            e.angle = e.angle % TWO_PI;
            ex = cos(e.angle) * radius;
            ey = sin(e.angle) * radius;
          }
        }

        push();
        translate(ex, ey, 0);
        fill(e.col);
        sphere(electronSize);

        if (!showOverlap && !showSpheres) {
          push();
          fill(255);
          drawBillboardText("-", 0, -electronSize * 2, 0, 10);
          pop();
        }
        pop();
      }
    }
    // Hiển thị nhãn 'Cl' nếu được bật
    if (labelEnabled) {
      push();
      fill(255);
      textSize(16);
      let labelYPos = this.shellRadii[this.shells.length - 1] + 20;
      drawBillboardText("Cl", 0, labelYPos, 0, 16);
      pop();
    }
  }
}

function drawSmoothCircle(radius) {
  let numPoints = 200;
  beginShape();
  for (let i = 0; i < numPoints; i++) {
    let angle = map(i, 0, numPoints, 0, TWO_PI);
    let x = radius * cos(angle);
    let y = radius * sin(angle);
    vertex(x, y);
  }
  endShape(CLOSE);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  perspective(PI / 3, windowWidth / windowHeight, 0.1, 4000);
  positionButtons();
}