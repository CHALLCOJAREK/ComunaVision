# C:\Proyectos\ComunaVision\gitpush.py
import subprocess
import datetime
import sys
import os
import shutil

# ======================================================
#   CONFIG
# ======================================================
ROOT_PROYECTO = r"C:\Proyectos\ComunaVision"

RUTA_BACKUP = r"C:\BACKUPS_JAREK\Backup-ComunaVision"
RUTA_ESTRUCTURA = os.path.join(ROOT_PROYECTO, "estructura.txt")

# ✅ SOLO esto se procesa (allowlist)
INCLUIR = [
    r"Backend",
    r"database",
    r"docs",
    r"Frontend",
    r"OCR",
    r"scripts",
    r".gitignore",
    r"estructura.txt",
    r"gitpush.py",
    r"Horario.html",
    r"README.md",
]

# ⛔ EXCLUSIONES explícitas dentro de lo incluido
EXCLUIR = [
    r"Backend\.venv",
    r"Backend\alembic",
]

# Para estructura: no listar contenido de carpetas (si lo deseas)
CARPETAS_NIVEL_LIMITADO = [".git"]


# ======================================================
# Helpers
# ======================================================
def norm_rel(p: str) -> str:
    """Normaliza a ruta relativa con backslashes (Windows)."""
    p = p.strip().strip('"')
    if os.path.isabs(p):
        p = os.path.relpath(p, ROOT_PROYECTO)
    return os.path.normpath(p)

def is_excluded(rel_path: str) -> bool:
    rel_path = norm_rel(rel_path)
    for ex in EXCLUIR:
        exn = norm_rel(ex)
        if rel_path == exn or rel_path.startswith(exn + os.sep):
            return True
    return False

def is_included(rel_path: str) -> bool:
    rel_path = norm_rel(rel_path)
    for inc in INCLUIR:
        incn = norm_rel(inc)
        if rel_path == incn or rel_path.startswith(incn + os.sep):
            return True
    return False

def run(cmd, msg_ok=None, allow_fail=False):
    result = subprocess.run(cmd, shell=True, text=True)
    if result.returncode != 0 and not allow_fail:
        print(f"\n❌  ERROR ejecutando: {cmd}")
        sys.exit(1)
    if msg_ok and result.returncode == 0:
        print(f"   ✔️  {msg_ok}")
    return result.returncode


# ======================================================
# Backup SOLO allowlist (excluyendo lo bloqueado)
# ======================================================
def hacer_backup():
    os.makedirs(RUTA_BACKUP, exist_ok=True)

    fecha = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    destino_root = os.path.join(RUTA_BACKUP, f"Backup_{fecha}")

    print("\n🗂️  Creando backup (solo allowlist)…\n")

    # Recolectar archivos a copiar
    archivos = []
    for inc in INCLUIR:
        rel = norm_rel(inc)
        abs_path = os.path.join(ROOT_PROYECTO, rel)

        if not os.path.exists(abs_path):
            continue

        if os.path.isfile(abs_path):
            if not is_excluded(rel):
                archivos.append(rel)
            continue

        # carpeta
        for carpeta_raiz, subdirs, files in os.walk(abs_path):
            rel_dir = os.path.relpath(carpeta_raiz, ROOT_PROYECTO)
            rel_dir = norm_rel(rel_dir)

            # cortar ramas excluidas
            subdirs[:] = [d for d in subdirs if not is_excluded(os.path.join(rel_dir, d))]

            if is_excluded(rel_dir):
                continue

            for f in files:
                rel_file = norm_rel(os.path.join(rel_dir, f))
                if is_included(rel_file) and not is_excluded(rel_file):
                    archivos.append(rel_file)

    archivos = sorted(set(archivos))
    total = len(archivos)

    if total == 0:
        print("❌ No hay archivos para copiar (allowlist vacío o rutas no existen).")
        return

    os.makedirs(destino_root, exist_ok=True)

    copiados = 0
    for rel_file in archivos:
        src = os.path.join(ROOT_PROYECTO, rel_file)
        dst = os.path.join(destino_root, rel_file)

        os.makedirs(os.path.dirname(dst), exist_ok=True)
        try:
            shutil.copy2(src, dst)
            copiados += 1
            porcentaje = (copiados / total) * 100
            sys.stdout.write(f"\r📦 Copiando archivos… {porcentaje:6.2f}%")
            sys.stdout.flush()
        except Exception as e:
            print(f"\n❌ Error copiando {src}: {e}")

    print(f"\n\n   ✔️  Backup creado en:\n       {destino_root}")


# ======================================================
# Estructura SOLO allowlist (excluyendo lo bloqueado)
# ======================================================
def escribir_estructura():
    print("\n📄  Generando estructura del proyecto (solo allowlist)…")

    lines = ["📦 ComunaVision\n"]

    def add_file_line(rel_file: str, depth: int):
        indent = " ┃ " * depth
        lines.append(f"{indent} ┣ 📜 {os.path.basename(rel_file)}\n")

    def add_folder_line(name: str, depth: int, limited: bool = False):
        indent = " ┃ " * depth
        if limited:
            lines.append(f"{indent}📂 {name}  (contenido limitado)\n")
        else:
            lines.append(f"{indent}📂 {name}\n")

    # Para que salga ordenado y consistente:
    incluir_norm = [norm_rel(x) for x in INCLUIR]
    incluir_norm = sorted(set(incluir_norm), key=lambda s: (s.count(os.sep), s.lower()))

    for inc in incluir_norm:
        if is_excluded(inc):
            continue

        abs_path = os.path.join(ROOT_PROYECTO, inc)
        if not os.path.exists(abs_path):
            continue

        # archivo suelto
        if os.path.isfile(abs_path):
            add_file_line(inc, 0)
            continue

        # carpeta
        top_name = os.path.basename(inc)
        add_folder_line(top_name, 0)

        for carpeta_raiz, subdirs, files in os.walk(abs_path):
            rel_dir = norm_rel(os.path.relpath(carpeta_raiz, ROOT_PROYECTO))

            if is_excluded(rel_dir):
                continue

            # limitar .git si aparece dentro de included (por si acaso)
            partes = rel_dir.split(os.sep)
            if partes and partes[0] in CARPETAS_NIVEL_LIMITADO:
                nivel = len(partes) - 1
                if nivel == 0:
                    add_folder_line(partes[0], 0, limited=True)
                elif nivel == 1:
                    add_folder_line(partes[1], 1, limited=False)
                continue

            depth = max(0, rel_dir.count(os.sep) - inc.count(os.sep))
            if rel_dir != inc:
                add_folder_line(os.path.basename(rel_dir), depth)

            # cortar ramas excluidas
            subdirs[:] = [d for d in subdirs if not is_excluded(os.path.join(rel_dir, d))]

            for f in sorted(files, key=lambda s: s.lower()):
                rel_file = norm_rel(os.path.join(rel_dir, f))
                if is_included(rel_file) and not is_excluded(rel_file):
                    add_file_line(rel_file, depth)

    with open(RUTA_ESTRUCTURA, "w", encoding="utf-8") as f:
        f.writelines(lines)

    print(f"   ✔️  Estructura guardada en:\n       {RUTA_ESTRUCTURA}")


# ======================================================
# Git: add SOLO allowlist + excluir lo bloqueado
# ======================================================
def git_add_allowlist():
    # 1) add explícito de lo permitido
    for inc in INCLUIR:
        rel = norm_rel(inc)
        if is_excluded(rel):
            continue
        abs_path = os.path.join(ROOT_PROYECTO, rel)
        if os.path.exists(abs_path):
            run(f'git add "{rel}"')

    # 2) por seguridad, “unstage” de exclusiones si se colaron
    for ex in EXCLUIR:
        rel = norm_rel(ex)
        abs_path = os.path.join(ROOT_PROYECTO, rel)
        if os.path.exists(abs_path):
            run(f'git reset -q HEAD -- "{rel}"', allow_fail=True)

def git_has_changes():
    # retorna 0 si hay cambios staged/unstaged, 1 si limpio
    # (usamos --porcelain: si hay output => cambios)
    p = subprocess.run("git status --porcelain", shell=True, text=True, capture_output=True)
    out = (p.stdout or "").strip()
    return len(out) > 0

def git_has_staged_changes():
    # 0 si hay staged, 1 si no
    p = subprocess.run("git diff --cached --name-only", shell=True, text=True, capture_output=True)
    out = (p.stdout or "").strip()
    return len(out) > 0


# ======================================================
# MAIN
# ======================================================
if __name__ == "__main__":
    os.chdir(ROOT_PROYECTO)

    mensaje = f"Auto-commit {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"

    print("\n====================================================")
    print(" 🔥  GIT PUSH + BACKUP + ESTRUCTURA – Allowlist Mode ")
    print("====================================================\n")

    print("📌  Inicializando proceso...\n")

    # 1) ESTRUCTURA
    escribir_estructura()

    # 2) GIT (solo allowlist)
    print("\n📂  Añadiendo archivos (solo allowlist)…")
    git_add_allowlist()
    print("   ✔️  Stage listo (allowlist)")

    # Si no hay staged, no comitea
    if not git_has_staged_changes():
        print("\n🟡  No hay cambios para commitear (staged vacío).")
    else:
        print("\n📝  Creando commit…")
        rc = run(f'git commit -m "{mensaje}"', allow_fail=True)
        if rc == 0:
            print("   ✔️  Commit creado")
            print("\n🚀  Subiendo cambios al repositorio remoto…")
            run("git push", "Push completado")
        else:
            print("🟡  Git commit no se creó (posible: nada que commitear).")

    # 3) BACKUP
    hacer_backup()

    print("\n✨  Todo ok. Solo lo permitido, y lo prohibido ni lo mira. 💼⚡\n")