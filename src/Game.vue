<script setup lang="js">
import { onMounted, nextTick } from "vue";
import { Vector3 } from "./Vector3";

const oninitCanvas = () => {
	nextTick(() => {
		/////////////////////////////////////////////////////////////////////////////////////
// Настройки отладки
/////////////////////////////////////////////////////////////////////////////////////

// Включить отладочные функции
let debug = 0;
// Удалить блокировку указателя для сборки 2k
let usePointerLock = 1;

/////////////////////////////////////////////////////////////////////////////////////
// Настройки рисования
/////////////////////////////////////////////////////////////////////////////////////

// Контекст canvas 2D
let c = document.getElementById("canvas");
let context = c.getContext("2d");

// Сколько дорожных сегментов рисовать перед игроком
let drawDistance = 800;
// FOV камеры (1 / Math.tan((угол обзора/2) * Math.PI/180))
let cameraDepth = 1;
// Длина каждого дорожного сегмента
let roadSegmentLength = 100;
// Какая ширина у дороги
let roadWidth = 500;
// Ширина дороги плюс предупредительная полоса
let warningTrackWidth = 150;
// Ширина пунктирной линии на дороге
let dashLineWidth = 9;
// Игрок не может двигаться дальше от центра дороги
let maxPlayerX = 2e3;
// Сколько гор в игре
let mountainCount = 30;
// Обратная частота кадров
let timeDelta = 1 / 60;

/////////////////////////////////////////////////////////////////////////////////////
// Настройки игрока
/////////////////////////////////////////////////////////////////////////////////////
// Насколько высоко находится игрок над землей
let playerHeight = 150;
// Максимальная скорость игрока
let playerMaxSpeed = 300;
// Ускорение игрока
let playerAccel = 1;
// Ускорение игрока при торможении
let playerBrake = -3;
// Скорость поворота игрока
let playerTurnControl = 0.2;
// Скорость z добавляемая для прыжка
let playerJumpSpeed = 25;
// Пружина управления креном игрока
let playerSpringConstant = 0.01;
// Замедление от столкновений
let playerCollisionSlow = 0.1;
// Скорость изменения угла камеры
let pitchLerp = 0.1;
// Уменьшение пружины крена
let pitchSpringDamping = 0.9;
// Эластичность отскока (2 - полный отскок, 1 - ни одного)
let elasticity = 1.2;
// Насколько сильно тянуть игрока на поворотах
let centrifugal = 0.002;
// Затухание скорости игрока по z
let forwardDamping = 0.999;
// Затухание скорости игрока по x
let lateralDamping = 0.7;
// Больше затухания, когда за пределами дороги
let offRoadDamping = 0.98;
// Гравитация для применения по оси y
let gravity = -1;
// Масштаб поворота игрока для поворота камеры
let cameraHeadingScale = 2;
// Насколько поворачивать мир вокруг поворотов
let worldRotateScale = 0.00005;

/////////////////////////////////////////////////////////////////////////////////////
// Настройки уровня
/////////////////////////////////////////////////////////////////////////////////////

// Время для начала
const maxTime = 20;
// Сколько времени на прохождение до точки контроля
const checkPointTime = 10;
// Как далеко между точками контроля
const checkPointDistance = 1e5;
// Сколько контрольных точек до максимальной сложности
const checkpointMaxDifficulty = 9;
// Сколько секций до конца дороги
const roadEnd = 1e4;

/////////////////////////////////////////////////////////////////////////////////////
// Глобальные игровые переменные
/////////////////////////////////////////////////////////////////////////////////////

// Позиция игрока в виде 3D вектора
let playerPos;
// Скорость игрока в виде 3D вектора
let playerVelocity;
// Пружина для крена игрока
let playerPitchSpring;
// Скорость пружины крена игрока
let playerPitchSpringVelocity;
// Крен дороги, или 0, если игрок в воздухе
let playerPitchRoad;
// Сколько кадров игрок в воздухе
let playerAirFrame;
// Направление для поворота небесного фона
let worldHeading;
// Случайное число для уровня
let randomSeed;
// Сохранение начального числа для активного использования
let startRandomSeed;
// Расстояние до следующей точки контроля
let nextCheckPoint;
// Текущее смещение оттенка для всех цветов HSL
let hueShift;
// Список дорожных сегментов
let road;
// Время до конца игры
let time;
// Время последнего обновления
let lastUpdate = 0;
// Коррекция частоты кадров
let timeBuffer = 0;

function StartLevel() {
	/////////////////////////////////////////////////////////////////////////////////////
	// Построить дорогу с процедурной генерацией
	/////////////////////////////////////////////////////////////////////////////////////

	// Начальное расстояние для сегмента
	let roadGenSectionDistanceMax = 0;
	// Начальная ширина дороги
	let roadGenWidth = roadWidth;
	// Расстояние, оставшееся для этого сегмента
	let roadGenSectionDistance = 0;
	// Длина конуса
	let roadGenTaper = 0;
	// Частота волны X
	let roadGenWaveFrequencyX = 0;
	// Частота волны Y
	let roadGenWaveFrequencyY = 0;
	// Масштаб волны X (размер поворота)
	let roadGenWaveScaleX = 0;
	// Масштаб волны Y (размер холма)
	let roadGenWaveScaleY = 0;
	// Установить случайное число
	startRandomSeed = randomSeed = Date.now();
	// Очистить список дорожных сегментов
	road = [];

	/////////////////////////////////////////////////////////////////////////////////////
	// Создание дороги
	/////////////////////////////////////////////////////////////////////////////////////

	// Построить дорогу за пределами конца
	for (let i = 0; i < roadEnd * 2; ++i) {
		// Проверить конец сегмента
		if (roadGenSectionDistance++ > roadGenSectionDistanceMax) {
			// Вычислить сложность в процентах
			const difficulty = Math.min(
				1,
				(i * roadSegmentLength) /
					checkPointDistance /
					checkpointMaxDifficulty
			);

			/////////////////////////////////////////////////////////////////////////////////////
			// Случайные настройки дороги
			/////////////////////////////////////////////////////////////////////////////////////

			// Ширина дороги
			roadGenWidth =
				roadWidth *
				Random(1 - difficulty * 0.7, 3 - 2 * difficulty);
			// Частота X
			roadGenWaveFrequencyX = Random(
				Lerp(difficulty, 0.01, 0.02)
			);
			// Частота Y
			roadGenWaveFrequencyY = Random(
				Lerp(difficulty, 0.01, 0.03)
			);
			// Масштаб X
			roadGenWaveScaleX =
				i > roadEnd ? 0 : Random(Lerp(difficulty, 0.2, 0.6));
			// Масштаб Y
			roadGenWaveScaleY = Random(Lerp(difficulty, 1e3, 2e3));

			/////////////////////////////////////////////////////////////////////////////////////
			// Применение конуса и перемещение назад
			/////////////////////////////////////////////////////////////////////////////////////

			// Случайный конус
			roadGenTaper = Random(99, 1e3) | 0;
			// Случайное расстояние сегмента
			roadGenSectionDistanceMax = roadGenTaper + Random(99, 1e3);
			// Сброс расстояния сегмента
			roadGenSectionDistance = 0;
			// Вычесть конус
			i -= roadGenTaper;
		}

		/////////////////////////////////////////////////////////////////////////////////////
		// Создание волнистой дороги
		/////////////////////////////////////////////////////////////////////////////////////

		// Дорога X
		const x =
			Math.sin(i * roadGenWaveFrequencyX) * roadGenWaveScaleX;
		// Дорога Y
		const y =
			Math.sin(i * roadGenWaveFrequencyY) * roadGenWaveScaleY;
		// Получить или создать сегмент дороги
		road[i] = road[i] ? road[i] : { x: x, y: y, w: roadGenWidth };

		/////////////////////////////////////////////////////////////////////////////////////
		// Применение конуса из последнего сегмента
		/////////////////////////////////////////////////////////////////////////////////////

		// Получить процент конуса
		const p = Clamp(roadGenSectionDistance / roadGenTaper, 0, 1);
		// Позиция X и конус
		road[i].x = Lerp(p, road[i].x, x);
		// Позиция Y и конус
		road[i].y = Lerp(p, road[i].y, y);
		// Проверка на конец дороги, ширину и конус
		road[i].w = i > roadEnd ? 0 : Lerp(p, road[i].w, roadGenWidth);
		// Угол наклона дороги
		road[i].a = road[i - 1]
			? Math.atan2(road[i - 1].y - road[i].y, roadSegmentLength)
			: 0;
	}

	/////////////////////////////////////////////////////////////////////////////////////
	// Инициализация игры
	/////////////////////////////////////////////////////////////////////////////////////

	// Сбросить все
	playerVelocity = new Vector3(
		(playerPitchSpring =
			playerPitchSpringVelocity =
			playerPitchRoad =
			hueShift =
				0)
	);
	// Установить позицию игрока
	playerPos = new Vector3(0, playerHeight);
	// Случайный поворот мира
	worldHeading = randomSeed;
	// Инициализировать следующую точку контроля
	nextCheckPoint = checkPointDistance;
	// Установить начальное время
	time = maxTime;
}

function Update() {
	// Регулировка времени, если запущено быстрее, чем 60 кадров в секунду, хотя это вызывает дрожь
	const now = performance.now();
	if (lastUpdate) {
		// Ограничить до 60 кадров в секунду
		const delta = now - lastUpdate;
		if (timeBuffer + delta < 0) {
			// Быстрый запуск
			requestAnimationFrame(Update);
			return;
		}

		// Обновить буфер времени
		timeBuffer += delta;
		timeBuffer -= timeDelta * 1e3;
		if (timeBuffer > timeDelta * 1e3) {
			// Если запускается слишком медленно
			timeBuffer = 0;
		}
	}
	lastUpdate = now;

	// Начало кадра
	if (snapshot) {
		c.width | 0;
	} // ОТЛАДКА УБРАТЬ ИЗ МИНИФИЦИРОВАННОГО
	// Очистить экран и установить размер
	else (c.width = window.innerWidth), (c.height = window.innerHeight);

	if (!c.width) {
		// УБРАТЬ
		// Исправить ошибку на itch, дождитесь canvas перед обновлением
		requestAnimationFrame(Update);
		return;
	}

	// Установить щелчок мыши, если блокировка указателя освобождена
	if (
		usePointerLock &&
		document.pointerLockElement !== c &&
		!touchMode
	) {
		mouseDown = 1;
	}

	UpdateDebugPre(); // ОТЛАДКА УБРАТЬ ИЗ МИНИФИЦИРОВАННОГО

/////////////////////////////////////////////////////////////////////////////////////
// обновление игрока - управление и физика
/////////////////////////////////////////////////////////////////////////////////////

// получить сегмент дороги игрока

// текущий сегмент дороги игрока
const playerRoadSegment = (playerPos.z / roadSegmentLength) | 0;
// насколько игрок прошел по текущему сегменту
const playerRoadSegmentPercent =
	(playerPos.z / roadSegmentLength) % 1;

/////////////////////////////////////////////////////////////////////////////////////
// получить лерпированные значения между последним и текущим сегментом дороги
/////////////////////////////////////////////////////////////////////////////////////

const playerRoadX = Lerp(
	playerRoadSegmentPercent,
	road[playerRoadSegment].x,
	road[playerRoadSegment + 1].x
);
const playerRoadY =
	Lerp(
		playerRoadSegmentPercent,
		road[playerRoadSegment].y,
		road[playerRoadSegment + 1].y
	) + playerHeight;
const roadPitch = Lerp(
	playerRoadSegmentPercent,
	road[playerRoadSegment].a,
	road[playerRoadSegment + 1].a
);

// сохранить последнюю скорость
const playerVelocityLast = playerVelocity.Add(0);
// гравитация
playerVelocity.y += gravity;
// применить боковое затухание
playerVelocity.x *= lateralDamping;
// применить затухание, предотвратить движение назад
playerVelocity.z = Math.max(
	0,
	time ? forwardDamping * playerVelocity.z : 0
);
// добавить скорость игрока
playerPos = playerPos.Add(playerVelocity);

// поворот
const playerTurnAmount = Lerp(
	playerVelocity.z / playerMaxSpeed,
	mouseX * playerTurnControl,
	0
);
// обновить скорость x
playerVelocity.x +=
	// применить поворот
	playerVelocity.z * playerTurnAmount -
	// применить центробежную силу
	playerVelocity.z ** 2 * centrifugal * playerRoadX;
// ограничить положение игрока по x
playerPos.x = Clamp(playerPos.x, -maxPlayerX, maxPlayerX);

/////////////////////////////////////////////////////////////////////////////////////
// проверить, находится ли на земле
/////////////////////////////////////////////////////////////////////////////////////

if (playerPos.y < playerRoadY) {
	/////////////////////////////////////////////////////////////////////////////////////
	// отскок скорости от нормали земли
	/////////////////////////////////////////////////////////////////////////////////////

	// соответствовать y земной плоскости
	playerPos.y = playerRoadY;
	// сбросить воздушные кадры грации
	playerAirFrame = 0;
	// получить нормаль земли
	playerVelocity = new Vector3(
		0,
		Math.cos(roadPitch),
		Math.sin(roadPitch)
	)
		// применить отскок
		.Multiply(
			-elasticity *
				// скалярное произведение дороги и скорости
				(Math.cos(roadPitch) * playerVelocity.y +
					Math.sin(roadPitch) * playerVelocity.z)
		)
		// добавить скорость
		.Add(playerVelocity);

	playerVelocity.z +=
		// применить тормоз
		mouseDown
			? playerBrake
			: // применить ускорение
			  Lerp(
					playerVelocity.z / playerMaxSpeed,
					mouseWasPressed * playerAccel,
					0
			  );

	// проверить, находится ли вне дороги
	if (Math.abs(playerPos.x) > road[playerRoadSegment].w) {
		// замедлиться при выходе с дороги
		playerVelocity.z *= offRoadDamping;
		// отскок при выходе с дороги
		playerPitchSpring += Math.sin(playerPos.z / 99) ** 4 / 99;
	}
}

/////////////////////////////////////////////////////////////////////////////////////
// обновление прыжка
/////////////////////////////////////////////////////////////////////////////////////

// проверить прыжок
if (
	playerAirFrame++ < 6 &&
	mouseDown &&
	mouseUpFrames &&
	mouseUpFrames < 9 &&
	time
) {
	// применить скорость прыжка
	playerVelocity.y += playerJumpSpeed;
	// предотвратить повторный прыжок
	playerAirFrame = 9;
}
// обновить кадры отпускания мыши для двойного щелчка
mouseUpFrames = mouseDown ? 0 : mouseUpFrames + 1;
// вычислить процент выше земли
const airPercent = (playerPos.y - playerRoadY) / 99;
// наклон вниз с вертикальной скоростью
playerPitchSpringVelocity += Lerp(
	airPercent,
	0,
	playerVelocity.y / 4e4
);

/////////////////////////////////////////////////////////////////////////////////////
// обновление тангажа игрока
/////////////////////////////////////////////////////////////////////////////////////

// наклон вниз с впереди идущим ускорением
playerPitchSpringVelocity +=
	(playerVelocity.z - playerVelocityLast.z) / 2e3;
// применить постоянную пружину тангажа
playerPitchSpringVelocity -=
	playerPitchSpring * playerSpringConstant;
// затухание пружины тангажа
playerPitchSpringVelocity *= pitchSpringDamping;
// обновить пружину тангажа
playerPitchSpring += playerPitchSpringVelocity;
// соответствовать наклону дороги
playerPitchRoad = Lerp(
	pitchLerp,
	playerPitchRoad,
	Lerp(airPercent, -roadPitch, 0)
);
// обновить тангаж игрока
const playerPitch = playerPitchSpring + playerPitchRoad;

// пересечение чекпоинта
if (playerPos.z > nextCheckPoint) {
	// добавить время
	time += checkPointTime;
	// установить следующий чекпоинт
	nextCheckPoint += checkPointDistance;
	// сдвиг цвета
	hueShift += 36;
}

/////////////////////////////////////////////////////////////////////////////////////
// рисование фона - небо, солнце/луна, горы и горизонт
/////////////////////////////////////////////////////////////////////////////////////

// многоразовые локальные переменные
let x, y, w, i;

// установить начальное зерно
randomSeed = startRandomSeed;
// обновить угол мира
worldHeading = ClampAngle(
	worldHeading + playerVelocity.z * playerRoadX * worldRotateScale
);

/////////////////////////////////////////////////////////////////////////////////////
// предварительно рассчитать масштаб проекции, перевернуть y, потому что y + внизу на холсте
/////////////////////////////////////////////////////////////////////////////////////

// получить масштаб проекции
const projectScale = new Vector3(1, -1, 1).Multiply(
	c.width / 2 / cameraDepth
);
// повернуть камеру с игроком
const cameraHeading = playerTurnAmount * cameraHeadingScale;
// применить угол с смещением
const cameraOffset = Math.sin(cameraHeading) / 2;

/////////////////////////////////////////////////////////////////////////////////////
// рисовать небо
/////////////////////////////////////////////////////////////////////////////////////

// яркость от солнца
const lighting = Math.cos(worldHeading);
// получить горизонтальную линию
const horizon =
	c.height / 2 - Math.tan(playerPitch) * projectScale.y;
// линейный градиент для неба
const g = context.createLinearGradient(
	0,
	horizon - c.height / 2,
	0,
	horizon
);
// верхний цвет неба
g.addColorStop(
	0,
	LSHA(
		39 + lighting * 25,
		49 + lighting * 19,
		230 - lighting * 19
	)
);
// нижний цвет неба
g.addColorStop(1, LSHA(5, 79, 250 - lighting * 9));
// нарисовать небо
DrawPoly(
	c.width / 2,
	0,
	c.width / 2,
	c.width / 2,
	c.height,
	c.width / 2,
	g
);

/////////////////////////////////////////////////////////////////////////////////////
// рисовать солнце и луну
/////////////////////////////////////////////////////////////////////////////////////

// 0 - солнце, 1 - луна
for (i = 2; i--; ) {
	// радиальный градиент для солнца
	const g = context.createRadialGradient(
		// угол 0 - центр
		(x =
			c.width *
			(0.5 +
				Lerp(
					// процент угла солнца
					(worldHeading / Math.PI / 2 + 0.5 + i / 2) % 1,
					// позиция x солнца, переместить далеко для заворачивания
					4,
					-4
				) -
				cameraOffset)),
		// позиция y солнца
		(y = horizon - c.width / 5),
		// размер солнца
		c.width / 25,
		// конечная позиция и размер солнца
		x,
		y,
		i ? c.width / 23 : c.width
	);
	// начальный цвет солнца
	g.addColorStop(0, LSHA(i ? 70 : 99));
	// конечный цвет солнца
	g.addColorStop(1, LSHA(0, 0, 0, 0));
	// нарисовать солнце
	DrawPoly(
		c.width / 2,
		0,
		c.width / 2,
		c.width / 2,
		c.height,
		c.width / 2,
		g
	);
}

/////////////////////////////////////////////////////////////////////////////////////
// рисовать горы
/////////////////////////////////////////////////////////////////////////////////////
// нарисовать каждую гору
for (i = mountainCount; i--; ) {
	// случайный угол горы
	const angle = ClampAngle(worldHeading + Random(19));
	// освещение горы
	const lighting = Math.cos(angle - worldHeading);
	DrawPoly(
		// позиция x горы, переместить далеко для заворачивания
		(x =
			c.width *
			(0.5 +
				Lerp(angle / Math.PI / 2 + 0.5, 4, -4) -
				cameraOffset)),
		// основание горы
		(y = horizon),
					// ширина горы
					(w = (Random(0.2, 0.8) ** 2 * c.width) / 2),
					// случайное смещение вершины
					x + w * Random(-0.5, 0.5),
					// высота горы
					y - Random(0.5, 0.8) * w,
					0,

					LSHA(
						Random(15, 25) + i / 3 - lighting * 9,
						i / 2 + Random(19),
						Random(220, 230)
					)
				);
			}

			/////////////////////////////////////////////////////////////////////////////////////
			// рисование горизонта
			/////////////////////////////////////////////////////////////////////////////////////

			// позиция и размер горизонта
			DrawPoly(
				c.width / 2,
				horizon,
				c.width / 2,
				c.width / 2,
				c.height,
				c.width / 2,
				LSHA(25, 30, 95)
			);

			/////////////////////////////////////////////////////////////////////////////////////
			// рисование дороги и объектов
			/////////////////////////////////////////////////////////////////////////////////////

			// вычислить смещения и проекции дороги по x
			for (x = w = i = 0; i < drawDistance + 1; ) {
				/////////////////////////////////////////////////////////////////////////////////////
				// создать позицию дороги в мире
				/////////////////////////////////////////////////////////////////////////////////////

				// установить позицию дороги
				let p = new Vector3(
					// суммировать локальные смещения дороги
					(x += w += road[playerRoadSegment + i].x),
					// позиция y и z дороги
					road[playerRoadSegment + i].y,
					(playerRoadSegment + i) * roadSegmentLength
				)
					// вычесть, чтобы получить локальное пространство
					.Add(playerPos.Multiply(-1));
				// повернуть камеру
				p.x =
					p.x * Math.cos(cameraHeading) -
					p.z * Math.sin(cameraHeading);

				/////////////////////////////////////////////////////////////////////////////////////
				// наклонить камеру по тангажу
				/////////////////////////////////////////////////////////////////////////////////////

				// инвертировать z для проекции
				const z =
					1 /
					(p.z * Math.cos(playerPitch) - p.y * Math.sin(playerPitch));
				p.y = p.y * Math.cos(playerPitch) - p.z * Math.sin(playerPitch);
				p.z = z;

				/////////////////////////////////////////////////////////////////////////////////////
				// проецировать сегмент дороги на холст
				/////////////////////////////////////////////////////////////////////////////////////

				// установить проекционную точку дороги
				road[playerRoadSegment + i++].p =
					// проекция
					p
						.Multiply(new Vector3(z, z, 1))
						// масштабирование
						.Multiply(projectScale)
						// центрирование на холсте
						.Add(new Vector3(c.width / 2, c.height / 2));
			}

			/////////////////////////////////////////////////////////////////////////////////////
			// нарисовать сегменты дороги
			/////////////////////////////////////////////////////////////////////////////////////

			// сохранить последний сегмент
			let segment2 = road[playerRoadSegment + drawDistance];
			// итерировать в обратном порядке
			for (i = drawDistance; i--; ) {
				const segment1 = road[playerRoadSegment + i];
				// случайное зерно для этого сегмента
				randomSeed = startRandomSeed + playerRoadSegment + i;
				// вычислить освещение сегмента
				const lighting =
					Math.sin(segment1.a) * Math.cos(worldHeading) * 99;
				// проекция точки
				const p1 = segment1.p;
				// последняя проекционная точка
				const p2 = segment2.p;
				// проверить ближний и дальний отсеки
				if (p1.z < 1e5 && p1.z > 0) {
					/////////////////////////////////////////////////////////////////////////////////////
					// нарисовать сегмент дороги
					/////////////////////////////////////////////////////////////////////////////////////

					// размытость в разрешении дороги
					if (i % (Lerp(i / drawDistance, 1, 9) | 0) == 0) {
						/////////////////////////////////////////////////////////////////////////////////////
						// земля
						/////////////////////////////////////////////////////////////////////////////////////

						// верх и низ земли
						DrawPoly(
							c.width / 2,
							p1.y,
							c.width / 2,
							c.width / 2,
							p2.y,
							c.width / 2,
							// цвет земли
							LSHA(25 + lighting, 30, 95)
						);

						/////////////////////////////////////////////////////////////////////////////////////
						// предупреждающая полоса
						/////////////////////////////////////////////////////////////////////////////////////
						// нет предупреждающей полосы, если тонкая
						if (segment1.w > 400) {
							// верх предупреждающей полосы
							DrawPoly(
								p1.x,
								p1.y,
								p1.z * (segment1.w + warningTrackWidth),
								// низ предупреждающей полосы
								p2.x,
								p2.y,
								p2.z * (segment2.w + warningTrackWidth),
								// цвет полосы предупреждения
								LSHA(
									((playerRoadSegment + i) % 19 < 9
										? 50
										: 20) + lighting
								)
							);
						}

						/////////////////////////////////////////////////////////////////////////////////////
						// дорога
						/////////////////////////////////////////////////////////////////////////////////////

						// расстояние сегмента
						const z = (playerRoadSegment + i) * roadSegmentLength;
						// верх дороги
						DrawPoly(
							p1.x,
							p1.y,
							p1.z * segment1.w,
							// низ дороги
							p2.x,
							p2.y,
							p2.z * segment2.w,
							// цвет дороги и чекпоинт
							LSHA(
								(z % checkPointDistance < 300 ? 70 : 7) +
									lighting
							)
						);

						/////////////////////////////////////////////////////////////////////////////////////
						// пунктирные линии
						/////////////////////////////////////////////////////////////////////////////////////

						// нет пунктирных линий, если очень тонкая
						if (segment1.w > 300) {
							// сделать пунктирные линии и пропустить, если далеко
							(playerRoadSegment + i) % 9 == 0 &&
								i < drawDistance / 3 &&
								// пунктирные линии сверху
								DrawPoly(
									p1.x,
									p1.y,
									p1.z * dashLineWidth,
									// пунктирные линии снизу
									p2.x,
									p2.y,
									p2.z * dashLineWidth,
									// цвет пунктирных линий
									LSHA(70 + lighting)
								);
						}
						// подготовка к следующему сегменту
						segment2 = segment1;
					}

					/////////////////////////////////////////////////////////////////////////////////////
					// случайный объект (дерево или камень)
					/////////////////////////////////////////////////////////////////////////////////////

					// проверить объект дороги
					if (Random() < 0.2 && playerRoadSegment + i > 29) {
						/////////////////////////////////////////////////////////////////////////////////////
						// проверка на столкновение с объектом игрока
						/////////////////////////////////////////////////////////////////////////////////////

						// расстояние сегмента
						const z = (playerRoadSegment + i) * roadSegmentLength;
						// тип объекта и высота
						const height = (Random(2) | 0) * 400;
						// выбрать позицию объекта
						x = 2 * roadWidth * Random(10, -10) * Random(9);
						// предотвратить столкновение с тем же объектом
						if (
							!segment1.h &&
							// столкновение по x
							Math.abs(playerPos.x - x) < 200 &&
							// столкновение по z
							Math.abs(playerPos.z - z) < 200 &&
							// столкновение по y + высота объекта
							playerPos.y - playerHeight <
								segment1.y + 200 + height
						) {
							// остановить игрока и пометить столкновение
							playerVelocity = playerVelocity.Multiply(
								(segment1.h = playerCollisionSlow)
							);
						}

						/////////////////////////////////////////////////////////////////////////////////////
						// рисование объекта дороги
						/////////////////////////////////////////////////////////////////////////////////////

						// размытость альфа объекта
						const alpha = Lerp(i / drawDistance, 4, 0);
						if (height) {
							// дерево
							// низ ствола
							DrawPoly(
								(x = p1.x + p1.z * x),
								p1.y,
								p1.z * 29,
								// верх ствола
								x,
								p1.y - 99 * p1.z,
								p1.z * 29,
								// цвет ствола
								LSHA(
									5 + Random(9),
									50 + Random(9),
									29 + Random(9),
									alpha
								)
							);
							// низ листвы
							DrawPoly(
								x,
								p1.y - Random(50, 99) * p1.z,
								p1.z * Random(199, 250),
								// верх листвы
								x,
								p1.y - Random(600, 800) * p1.z,
								0,
								// цвет листвы
								LSHA(
									25 + Random(9),
									80 + Random(9),
									9 + Random(29),
									alpha
								)
							);
						} else {
							// камень
							// низ камня
							DrawPoly(
								(x = p1.x + p1.z * x),
								p1.y,
								p1.z * Random(200, 250),
								// верх камня
								x + p1.z * Random(99, -99),
								p1.y - Random(200, 250) * p1.z,
								p1.z * Random(99),
								// цвет камня
								LSHA(
									50 + Random(19),
									25 + Random(19),
									209 + Random(9),
									alpha
								)
							);
						}
					}
				}
			}

			if (mouseWasPressed) {
				// показать и обновить время
				DrawText(
					Math.ceil((time = Clamp(time - timeDelta, 0, maxTime))),
					9
				);
				// установить правое выравнивание для расстояния
				context.textAlign = "right";
				// показать расстояние
				DrawText(0 | (playerPos.z / 1e3), c.width - 9);
			} else {
				// установить центральное выравнивание для заголовка
				context.textAlign = "center";
				// нарисовать текст заголовка
				DrawText("ultra gonki", c.width / 2);
			}
			// запустить следующий кадр
			requestAnimationFrame(Update);
		}

		/////////////////////////////////////////////////////////////////////////////////////
		// математика и вспомогательные функции
		/////////////////////////////////////////////////////////////////////////////////////

		const LSHA = (l, s = 0, h = 0, a = 1) =>
			`hsl(${h + hueShift},${s}%,${l}%,${a})`;
		const Clamp = (v, min, max) => Math.min(Math.max(v, min), max);
		const ClampAngle = (a) =>
			((a + Math.PI) % (2 * Math.PI)) +
			(a + Math.PI < 0 ? Math.PI : -Math.PI);
		const Lerp = (p, a, b) => a + Clamp(p, 0, 1) * (b - a);
		const Random = (max = 1, min = 0) =>
			Lerp(((Math.sin(++randomSeed) + 1) * 1e5) % 1, min, max);

		/////////////////////////////////////////////////////////////////////////////////////
		// нарисовать трапециевидный полигон
		/////////////////////////////////////////////////////////////////////////////////////
		function DrawPoly(x1, y1, w1, x2, y2, w2, fillStyle) {
			context.beginPath((context.fillStyle = fillStyle));
			context.lineTo(x1 - w1, y1 | 0);
			context.lineTo(x1 + w1, y1 | 0);
			context.lineTo(x2 + w2, y2 | 0);
			context.lineTo(x2 - w2, y2 | 0);
			context.fill();
		}

		/////////////////////////////////////////////////////////////////////////////////////
		// нарисовать контурный текст hud
		/////////////////////////////////////////////////////////////////////////////////////
		function DrawText(text, posX) {
			// установить размер шрифта
			context.font = "9em impact";
			// установить шрифт
			context.fillStyle = LSHA(99, 0, 0, 0.5);
			// заполнить текст
			context.fillText(text, posX, 129);
			// ширина линии
			context.lineWidth = 3;
			// контур текста
			context.strokeText(text, posX, 129);
		}

		/////////////////////////////////////////////////////////////////////////////////////
		// ввод с мыши
		/////////////////////////////////////////////////////////////////////////////////////

		let mouseDown = 0;
		let mouseWasPressed = 0;
		let mouseUpFrames = 0;
		let mouseX = 0;
		let mouseLockX = 0;
		let touchMode = 0;

		onmouseup = (e) => (mouseDown = 0);
		onmousedown = (e) => {
			if (mouseWasPressed) {
				mouseDown = 1;
			}
			mouseWasPressed = 1;
			if (
				usePointerLock &&
				e.button == 0 &&
				document.pointerLockElement !== c
			) {
				c.requestPointerLock =
					c.requestPointerLock || c.mozRequestPointerLock;
				c.requestPointerLock();
				mouseLockX = 0;
			}
		};

		onmousemove = (e) => {
			if (!usePointerLock) {
				mouseX = (e.x / window.innerWidth) * 2 - 1;
				return;
			}

			if (document.pointerLockElement !== c) {
				return;
			}

			// коррекция для блокировки указателя
			mouseLockX += e.movementX;
			mouseLockX = Clamp(
				mouseLockX,
				-window.innerWidth / 2,
				window.innerWidth / 2
			);

			// применить кривую к вводу
			const inputCurve = 1.5;
			mouseX = mouseLockX;
			mouseX /= window.innerWidth / 2;
			mouseX =
				Math.sign(mouseX) * (1 - (1 - Math.abs(mouseX)) ** inputCurve);
			mouseX *= window.innerWidth / 2;
			mouseX += window.innerWidth / 2;
			mouseX = (mouseX / window.innerWidth) * 2 - 1;
		};

		/////////////////////////////////////////////////////////////////////////////////////
		// управление сенсором
		/////////////////////////////////////////////////////////////////////////////////////

		if (typeof ontouchend != "undefined") {
			let ProcessTouch = (e) => {
				e.preventDefault();
				mouseDown = !(e.touches.length > 0);
				mouseWasPressed = 1;
				touchMode = 1;

				if (mouseDown) return;

				// среднее всех позиций касания
				let x = 0,
					y = 0;
				for (let touch of e.touches) {
					x += touch.clientX;
					y += touch.clientY;
				}
				mouseX = x / e.touches.length;
				mouseX = (mouseX / window.innerWidth) * 2 - 1;
			};

			c.addEventListener("touchstart", ProcessTouch, false);
			c.addEventListener("touchmove", ProcessTouch, false);
			c.addEventListener("touchcancel", ProcessTouch, false);
			c.addEventListener("touchend", ProcessTouch, false);
		}

		/////////////////////////////////////////////////////////////////////////////////////
		// отладочные функции
		/////////////////////////////////////////////////////////////////////////////////////

		let debugPrintLines;
		let snapshot;

		function UpdateDebugPre() {
			debugPrintLines = [];
			// R = перезапуск
			if (inputWasPushed[82]) {
				mouseLockX = 0;
				StartLevel();
			}
			// 1 = скриншот
			if (inputWasPushed[49]) {
				snapshot = 1;

				// использовать разрешение 1080p
				c.width = 1920;
				c.height = 1080;
			}
		}

		function UpdateDebugPost() {
			if (snapshot) {
				SaveSnapshot();
				snapshot = 0;
			}

			UpdateInput();

			if (!debug) {
				return;
			}

			UpdateFps();

			context.font = '2em"';
			for (let i in debugPrintLines) {
				let line = debugPrintLines[i];
				context.fillStyle = line.color;
				context.fillText(line.text, c.width / 2, 35 + 35 * i);
			}
		}

		function DebugPrint(text, color = "#F00") {
			if (!debug) {
				return;
			}

			if (typeof text == "object") {
				text += JSON.stringify(text);
			}

			let line = { text: text, color: color };
			debugPrintLines.push(line);
		}

		function SaveSnapshot() {
			downloadLink.download = "snapshot.png";
			downloadLink.href = c
				.toDataURL("image/jpg")
				.replace("image/jpg", "image/octet-stream");
			downloadLink.click();
		}

		/////////////////////////////////////////////////////////////////////////////////////
		// счетчик частоты кадров
		/////////////////////////////////////////////////////////////////////////////////////

		let lastFpsMS = 0;
		let averageFps = 0;
		function UpdateFps() {
			let ms = performance.now();
			let deltaMS = ms - lastFpsMS;
			lastFpsMS = ms;

			let fps = 1 / (deltaMS / 1e3);
			averageFps = averageFps * 0.9 + fps * 0.1;
			context.font = '3em"';
			context.fillStyle = "#0007";
			context.fillText(averageFps | 0, c.width - 90, c.height - 40);
		}

		/////////////////////////////////////////////////////////////////////////////////////
		// клавиатурное управление
		/////////////////////////////////////////////////////////////////////////////////////

		let inputIsDown = [];
		let inputWasDown = [];
		let inputWasPushed = [];
		onkeydown = (e) => (inputIsDown[e.keyCode] = 1);
		onkeyup = (e) => (inputIsDown[e.keyCode] = 0);
		function UpdateInput() {
			inputWasPushed = inputIsDown.map((e, i) => e && !inputWasDown[i]);
			inputWasDown = inputIsDown.slice();
		}

		/////////////////////////////////////////////////////////////////////////////////////
		// инициализация ultra gonki
		/////////////////////////////////////////////////////////////////////////////////////

		// запуск и начало цикла обновления

		StartLevel();
		Update();
	});
};
onMounted(() => {
	oninitCanvas();
});
</script>

<template>
	<canvas id="canvas" class=".canvas"></canvas>
</template>

<style>
.canvas {
	touch-action: none;
	position: absolute;

	left: 0px;
	top: 0px;
	width: 100%;
	height: 100%;
}
</style>
