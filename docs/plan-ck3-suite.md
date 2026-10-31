# Plan: suite local de builds para CK3

Versión del juego de referencia: **1.20.1.2 "Crozier"** (con By God Alone).
Equipos: **PC con Windows** (tiene el juego) y **laptop con CachyOS** (donde se desarrolla).

## 1. Objetivo

Una herramienta local, usable desde el celular, que:

1. Calcule los puntos de un build del Ruler Designer y avise al pasar de **400** (límite para conservar logros).
2. Permita comparar builds por objetivo (economía, intriga, equilibrado).
3. Se pueda actualizar tras cada parche leyendo los datos del propio juego.

Fuera de alcance por ahora: lector de partidas guardadas (ck3-strategy-advisor) y cualquier mod.

## 2. Qué va en cada equipo

| Equipo | Qué hace |
|---|---|
| PC Windows | Solo aporta los archivos de datos del juego (los mínimos). |
| Laptop CachyOS | Proyecto, script extractor y página web. |

Los archivos del juego quedan solo en tus equipos: no se suben ni se comparten.

## 3. Datos ya conocidos (verificar contra tu panel)

Reglas confirmadas en tu pantalla:

- Límite para logros: **400 puntos**.
- Cada **punto de habilidad** cuesta **4** (quitarlo devuelve 4).
- Cada **hijo/hija** cuesta **10**; **casarse es gratis**.
- Edad: en tu caso, 173 puntos a los 28 años y 114 a los 18 (otras edades: por medir).
- Rasgo de comandante: 25. Rasgo de niñez: 5 (según la wiki).

Rasgos congénitos (costo en Ruler Designer):

| Rasgo | Costo |
|---|---|
| Genio | 240 |
| Hercúleo / Amazona | 180 |
| Inteligente | 160 |
| Hermoso | 120 |
| Robusto | 120 |
| Apuesto / Bonita | 80 |
| Rápido | 80 |
| Sano | 60 |
| Fecundo | 50 |
| Sangre pura | 50 |
| Agraciado | 40 |
| Gigante | 20 |

Rasgos de personalidad (de tus capturas):

- **40:** Moderado, Diligente, Valiente, Ambicioso, Insensible, Sádico
- **30:** Codicioso, Irascible, Paciente, Falso, Gregario, Arbitrario, Cínico, Ferviente, Testarudo, Revanchista
- **25:** Concupiscente, Calmo, Impaciente, Inconstante, Indulgente
- **20:** Casto, Voraz, Generoso, Arrogante, Humilde, Honesto, Satisfecho
- **15:** Excéntrico
- **10:** Confiado, Compasivo
- **Devuelven 10:** Vago, Pusilánime, Tímido, Paranoico

Educación de Administración (de tus capturas): 1★ Gandul indulgente 0, 2★ Secretario ahorrativo +20, 3★ Creador de fortunas +40, 4★ Toque de Midas +80.

### Datos por verificar

- Cómo cambia el costo con la **edad** (hay que medir varias edades).
- Costos de las demás educaciones y niveles.
- Qué rasgos son opuestos entre sí (no se pueden combinar).
- Cuántos rasgos de personalidad se permiten.
- Si el costo cambia según cultura o fe.

## 4. Estructura del proyecto (laptop)

```
ck3-builds/
├── data/
│   ├── raw/            # copia de carpetas del juego (solo local)
│   └── traits.json     # salida del extractor
├── extractor/
│   └── extract.py
├── web/
│   └── index.html      # calculadora (un solo archivo)
└── README.md
```

## 5. Paso a paso

### 5.1 Preparar el laptop (CachyOS)

```bash
sudo pacman -S python git openssh
python -m venv .venv
source .venv/bin/activate
mkdir -p ck3-builds/{data/raw,extractor,web}
```

### 5.2 Ubicar los datos del juego (PC Windows)

Ruta típica con Steam:

```
C:\Program Files (x86)\Steam\steamapps\common\Crusader Kings III\game
```

Carpetas a copiar (solo lo necesario):

- `common\traits\`: definiciones de rasgos (probable origen de los costos; **por verificar**).
- `localization\spanish\` o `english\`: nombres de los rasgos.
- Posiblemente `common\defines\` y otra más: se decide al revisar los archivos.

### 5.3 Pasar los datos al laptop

Opción A: USB o carpeta compartida.

Opción B: por red con `scp`.

En el laptop, activa SSH:

```bash
sudo systemctl enable --now sshd
```

En el PC (PowerShell), comprime y envía:

```powershell
Compress-Archive -Path "C:\ruta\al\juego\game\common\traits" -DestinationPath traits.zip
scp traits.zip usuario@IP_DEL_LAPTOP:~/ck3-builds/data/raw/
```

### 5.4 Extractor (Python)

- Lee los archivos de rasgos (formato de script de Paradox, **no es JSON**).
- Extrae: nombre, categoría, costo del diseñador, opuestos, nombre localizado.
- Escribe `data/traits.json`.
- Antes de programarlo hay que **mirar el formato real** de los archivos.

### 5.5 Página móvil

- Un solo `index.html` que carga `traits.json`.
- Contador de 400 puntos, rasgos, habilidades (4 por punto), hijos, edad y educación.
- Para probarla en el celular, en la misma red Wi-Fi:

```bash
cd ck3-builds/web
python -m http.server 8000 --bind 0.0.0.0
```

Abre `http://IP_DEL_LAPTOP:8000` desde el móvil. Si no carga, revisa el firewall del laptop.

## 6. Validación

Compara el resultado de la herramienta con el contador del juego:

- Tu build de referencia: **398 de 400** (educación Administración 2★, Diplomacia 13, Intriga 9, Aprendizaje 8, Marcialidad 7, Destreza 7, 1 hijo y 1 hija, edad 18).
- Si no cuadra, ajusta las reglas de edad y educación hasta que coincida.

## 7. Mantenimiento

- Tras cada parche: copiar de nuevo las carpetas, correr el extractor y revisar diferencias.
- Los datos y archivos del juego no se redistribuyen.
- Si se usan datos de ck3db.com, citarlos y respetar sus condiciones (no pude leerlas).

## 8. Siguientes pasos

1. Copiar `common\traits\` y la localización al laptop.
2. Revisar el formato y decidir cómo parsearlo.
3. Escribir el extractor y generar `traits.json`.
4. Construir la página móvil.
5. Validar con el build de 398 puntos.
