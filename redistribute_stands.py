#!/usr/bin/env python3
"""
Распределяет 141 стенд с эксклюзивной страницы по трём страницам: по 47 на каждой.
- Эксклюзивные: первые 47 (индексы 0-46)
- Типовые: следующие 47 (47-93)
- Нестандартные: последние 47 (94-140)
Копирует изображения в папки страниц и обновляет пути в YAML.
"""
import os
import re
import shutil
import yaml
from pathlib import Path

BASE = Path(__file__).resolve().parent
PAGES = BASE / "user" / "pages" / "03.uslugi" / "01.razrabotka-stendov"
EKSLUZIV_DIR = PAGES / "03.ekskluziv"
TYPOVYE_DIR = PAGES / "01.typovye"
NESTANDART_DIR = PAGES / "02.nestandart"
EKSLUZIV_MD = EKSLUZIV_DIR / "blog.ru.md"
TYPOVYE_MD = TYPOVYE_DIR / "stand-page.ru.md"
NESTANDART_MD = NESTANDART_DIR / "stand-page.ru.md"

# Путь относительно корня Grav (user/pages/...)
EKSLUZIV_PATH_PREFIX = "user/pages/03.uslugi/01.razrabotka-stendov/03.ekskluziv"
TYPOVYE_PATH_PREFIX = "user/pages/03.uslugi/01.razrabotka-stendov/01.typovye"
NESTANDART_PATH_PREFIX = "user/pages/03.uslugi/01.razrabotka-stendov/02.nestandart"


def load_ekskluziv():
    """Загружает frontmatter и контент из blog.ru.md эксклюзивных."""
    text = EKSLUZIV_MD.read_text(encoding="utf-8")
    match = re.match(r'^---\r?\n(.*?)\r?\n---\r?\n(.*)$', text, re.DOTALL)
    if not match:
        raise SystemExit("Не найден frontmatter в blog.ru.md")
    frontmatter_str, content = match.group(1), match.group(2)
    data = yaml.safe_load(frontmatter_str)
    return data, content


def copy_image_and_remap_stand(stand, dest_dir, path_prefix, file_prefix):
    """
    Копирует все изображения стенда в dest_dir с префиксом имени файла.
    Возвращает копию стенда с обновлёнными путями image_upload.
    """
    dest_dir = Path(dest_dir)
    source_dir = EKSLUZIV_DIR
    new_stand = yaml_deep_copy(stand)

    if "images" not in new_stand or not new_stand["images"]:
        return new_stand

    for img_entry in new_stand["images"]:
        if "image_upload" not in img_entry or not img_entry["image_upload"]:
            continue
        # image_upload — dict с одним ключом-путём и значением {name, full_path, type, size, path}
        old_key = list(img_entry["image_upload"].keys())[0]
        meta = img_entry["image_upload"][old_key]
        old_name = meta.get("name") or os.path.basename(old_key)
        new_name = f"{file_prefix}{old_name}"
        new_path = f"{path_prefix}/{new_name}"

        src_file = BASE / old_key.replace("/", os.sep)
        if not src_file.is_file():
            # попробовать относительно user
            src_file = BASE / "user" / old_key.replace("user/", "").replace("/", os.sep)
        if not src_file.is_file():
            print(f"  Пропуск (файл не найден): {old_key}")
            continue

        dest_file = dest_dir / new_name
        shutil.copy2(src_file, dest_file)
        print(f"  Скопировано: {old_name} -> {dest_dir.name}/{new_name}")

        # новый image_upload с одним ключом
        new_meta = {
            "name": new_name,
            "full_path": new_name,
            "type": meta.get("type", "image/jpeg"),
            "size": meta.get("size", 0),
            "path": new_path,
        }
        img_entry["image_upload"] = {new_path: new_meta}

    return new_stand


def yaml_deep_copy(obj):
    """Глубокая копия через YAML (сохраняет структуру)."""
    return yaml.safe_load(yaml.dump(obj, allow_unicode=True, default_flow_style=False))


def save_page(filepath, header, gallery, content, media_order=None):
    """Пишет markdown-файл с frontmatter и контентом."""
    header = dict(header)
    header["gallery"] = gallery
    if media_order is not None:
        header["media_order"] = media_order
    # Удаляем media_order если его не было в оригинале для typovye/nestandart
    fm = yaml.dump(
        header,
        allow_unicode=True,
        default_flow_style=False,
        sort_keys=False,
        width=1000,
    )
    body = content.strip()
    out = "---\n" + fm + "---\n\n" + body + "\n"
    filepath.write_text(out, encoding="utf-8")
    print(f"Записано: {filepath}")


def main():
    print("Загрузка blog.ru.md (эксклюзивные)...")
    data, content = load_ekskluziv()
    gallery = data.get("gallery") or []
    n = len(gallery)
    if n < 141:
        print(f"Внимание: в галерее {n} стендов, ожидалось 141. Будут распределены все {n}.")
    else:
        gallery = gallery[:141]

    # Заголовки страниц (без gallery)
    eks_header = {k: v for k, v in data.items() if k != "gallery"}
    typovye_header = {
        "title": "Типовые стенды",
        "menu": "Типовые стенды",
        "visible": True,
        "template": "stand-page",
    }
    nestandart_header = {
        "title": "Нестандартные стенды",
        "menu": "Нестандартные стенды",
        "visible": True,
        "template": "stand-page",
    }

    # 1) Эксклюзивные: первые 47, без копирования файлов
    gallery_eks = gallery[0:47]
    save_page(
        EKSLUZIV_MD,
        eks_header,
        gallery_eks,
        content,
        media_order=eks_header.get("media_order"),
    )
    print(f"Эксклюзивные: {len(gallery_eks)} стендов")

    # 2) Типовые: 47-94, копировать картинки в 01.typovye
    gallery_typovye = []
    for i, stand in enumerate(gallery[47:94]):
        print(f"Типовые: стенд {i+1}/47")
        new_stand = copy_image_and_remap_stand(
            stand,
            TYPOVYE_DIR,
            TYPOVYE_PATH_PREFIX,
            f"t{i}_",
        )
        gallery_typovye.append(new_stand)

    typovye_content = (TYPOVYE_MD.read_text(encoding="utf-8") if TYPOVYE_MD.exists() else "").split("---", 2)
    if len(typovye_content) >= 3:
        typovye_content = typovye_content[2].strip()  # только body
    else:
        typovye_content = """# Типовые стенды
## Быстро. Надежно. Выгодно

Ограниченность бюджета не означает, что придется использовать безликое сооружение, которое сведет к минимуму не только затраты на участие, но и эффективность выставочной работы.
**Строительство стендов** может осуществляться на основе стандартной конструкции, при этом результат будет впечатляющим и оригинальным, если подойти к задаче творчески.

## Типовой (стандартный) стенд

Быстро собираемая и разбираемая конструкция *(Octanorm или Konsta)*, включающая:

- Настил ковролина *(цвет — серый)*
- Стеновые ограждения белого цвета по периметру стенда
- Фризовая панель с названием компании
- Освещение, электрический щит и разводка электрики
- Информационная стойка
- Мебель: стол переговорный, стулья, барный стул
- Закрытая переговорная или хозблок *(для площади от 24 кв. м)*
- Вешалка, урна

### Когда выбирать типовой стенд?

- Первое участие в выставке
- Небольшой бюджет
- Срочная подготовка
- Участие в нескольких выставках подряд
"""

    save_page(TYPOVYE_MD, typovye_header, gallery_typovye, typovye_content)
    print(f"Типовые: {len(gallery_typovye)} стендов")

    # 3) Нестандартные: 94-141
    gallery_nestandart = []
    for i, stand in enumerate(gallery[94:141]):
        print(f"Нестандартные: стенд {i+1}/47")
        new_stand = copy_image_and_remap_stand(
            stand,
            NESTANDART_DIR,
            NESTANDART_PATH_PREFIX,
            f"n{i}_",
        )
        gallery_nestandart.append(new_stand)

    nestandart_content = (NESTANDART_MD.read_text(encoding="utf-8") if NESTANDART_MD.exists() else "").split("---", 2)
    if len(nestandart_content) >= 3:
        nestandart_content = nestandart_content[2].strip()
    else:
        nestandart_content = """# Нестандартные стенды

Даже строительство стендов интересной конфигурации может быть экономичным — разумная экономия возможна и здесь.
Однако любые замены узлов или материалов должны согласовываться с дизайнерами, чтобы сохранить прочностные характеристики.
Четкая концепция позволяет специалисту предложить **несколько вариантов дизайна**, соответствующих бюджету.

## Нестандартный стенд

Застройка на основе стандартных конструкций *(Octanorm и Konsta)* с добавлением:

- Витрин, стеллажей
- Дополнительного освещения
- Радиусных элементов
- Аппликации пленкой (Оракал)
- Индивидуальных оформительских решений

### Кому подойдет такое решение?

- Компаниям, которые хотят выделиться без полного индивидуального проекта
- Участникам нескольких выставок в году
- Брендам с выраженным фирменным стилем и ограниченным бюджетом
- Для презентации новых продуктов и услуг
"""

    save_page(NESTANDART_MD, nestandart_header, gallery_nestandart, nestandart_content)
    print(f"Нестандартные: {len(gallery_nestandart)} стендов")
    print("Готово.")


if __name__ == "__main__":
    main()
