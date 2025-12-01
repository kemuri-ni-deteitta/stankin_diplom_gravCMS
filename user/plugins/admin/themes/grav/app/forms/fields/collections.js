import $ from 'jquery';
import Sortable from 'sortablejs';
import '../../utils/jquery-utils';

export default class CollectionsField {
  constructor() {
    this.lists = $();

    const body = $('body');
    const collections = $('[data-type="collection"]');
    collections.each((index, list) => {
      this.addList(list);
    });

    body.on('mutation._grav', this._onAddedNodes.bind(this));
    body.on('click', (event) => {
      const target = $(event.target);
      if (!(target.is('[data-action="confirm"], [data-action="delete"]') || target.closest('[data-action="confirm"], [data-action="delete"]').length)) {
        CollectionsField.closeConfirmations();
      }
    });

    // Инициализируем постоянное отслеживание позиции кнопок "Добавить проект"
    setTimeout(() => {
      this._initGalleryButtonWatcher();
      // Также перемещаем все кнопки при инициализации
      this._fixAllGalleryButtons();
    }, 500);
  }

  addList(list) {
    list = $(list);
    this.lists = this.lists.add(list);

    // ОРИГИНАЛЬНАЯ КНОПКА "ДОБАВИТЬ ПРОЕКТ" (В КОНЦЕ СПИСКА)
    list.on('click', '> .collection-actions [data-action="add"]', (event) => {
      let button = $(event.currentTarget);

      // Проверяем, что кнопка не отключена
      if (button.prop('disabled')) {
        return;
      }

      // Проверяем, что это НЕ наша новая кнопка (не имеет data-gallery-button="true")
      if (button.attr('data-gallery-button') === 'true') {
        return;
      }

      // Предотвращаем повторные клики во время обработки
      if (button.data('processing')) {
        return;
      }

      button.data('processing', true);

      try {
        this.addItem(event);
      } finally {
        // Снимаем флаг обработки через небольшую задержку
        setTimeout(() => {
          button.data('processing', false);
        }, 500);
      }
    });

    // НОВАЯ КНОПКА "ДОБАВИТЬ ПРОЕКТ" ВНУТРИ ЭЛЕМЕНТА СПИСКА
    // Используем более простой селектор и проверяем атрибут внутри обработчика
    list.on('click', 'li[data-collection-item] .collection-actions [data-action="add"]', (event) => {
      let button = $(event.currentTarget);

      // Проверяем, что это наша кнопка (имеет data-gallery-button="true")
      if (button.attr('data-gallery-button') !== 'true') {
        // Это не наша кнопка, пропускаем (это может быть кнопка из другого списка)
        return;
      }

      // Останавливаем всплытие, чтобы не сработал обработчик основной кнопки
      event.stopPropagation();
      event.preventDefault();
      this.addItem(event);
      return false;
    });
    list.on('click', '> ul > li > .item-actions [data-action="confirm"]', (event) => this.confirmRemove(event));
    list.on('click', '> ul > li > .item-actions [data-action="delete"]', (event) => this.removeItem(event));
    list.on('click', '> ul > li > .item-actions [data-action="collapse"]', (event) => this.collapseItem(event));
    list.on('click', '> ul > li > .item-actions [data-action="expand"]', (event) => this.expandItem(event));
    list.on('click', '> .collection-actions [data-action-sort="date"]', (event) => this.sortItems(event));
    list.on('click', '> .collection-actions [data-action="collapse_all"]', (event) => this.collapseItems(event));
    list.on('click', '> .collection-actions [data-action="expand_all"]', (event) => this.expandItems(event));
    list.on('input change', '[data-key-observe]', (event) => this.observeKey(event));

    list.find('[data-collection-holder]').each((index, container) => {
      container = $(container);
      if (container.data('collection-sort') || container[0].hasAttribute('data-collection-nosort')) {
        return;
      }

      container.data('collection-sort', new Sortable(container.get(0), {
        forceFallback: false,
        handle: '.collection-sort',
        animation: 150,
        onUpdate: () => this.reindex(container)
      }));
    });

    this._updateActionsStateBasedOnMinMax(list);
  }

  addItem(event) {
    let button = $(event.currentTarget);
    let position = button.data('action-add') || 'bottom';

    /**
     * ШАГ 2: Находим контейнер коллекции (список)
     *
     * Структура DOM:
     * <div data-type="collection">  <-- ВОТ ЭТО МЫ ИЩЕМ
     *   <ul data-collection-holder>
     *     <li data-collection-item>...</li>
     *   </ul>
     *   <div class="collection-actions">
     *     <button data-action="add">...</button>  <-- КНОПКА ЗДЕСЬ
     *   </div>
     * </div>
     *
     * ВАЖНО: Для вложенных списков (например, .images внутри проекта) нужно найти
     * правильный контейнер коллекции. Если кнопка находится внутри элемента проекта,
     * но это кнопка "Добавить фотографию", то нужно найти вложенный список .images,
     * а не основной список header.gallery
     */
    let list = null;

    // Сначала проверяем, находится ли кнопка внутри элемента списка
    let listItem = button.closest('li[data-collection-item]');

    if (listItem.length) {
      // Кнопка находится внутри элемента списка
      // Проверяем, это кнопка "Добавить фотографию" (во вложенном списке) или "Добавить проект"
      let isGalleryButton = button.attr('data-gallery-button') === 'true';

      if (isGalleryButton) {
        // Это кнопка "Добавить проект" - ищем основной список header.gallery
        list = $(listItem.closest('[data-type="collection"]'));
      } else {
        // Это кнопка "Добавить фотографию" - ищем вложенный список .images внутри этого элемента
        // Ищем вложенный список внутри текущего элемента проекта
        list = listItem.find('[data-type="collection"]').first();

        // Если не нашли вложенный список, возможно кнопка находится в другом месте
        if (!list.length) {
          // Пробуем найти через родительский элемент
          list = $(button.closest('[data-type="collection"]'));
        }
      }
    } else {
      // Кнопка не внутри элемента списка - ищем ближайший контейнер коллекции
      list = $(button.closest('[data-type="collection"]'));
    }

    if (!list.length) {
      return;
    }

    /**
     * ШАГ 3: Находим шаблон нового элемента
     *
     * Шаблон хранится в скрытом div внутри контейнера коллекции:
     * <div data-type="collection">
     *   ...
     *   <div style="display: none;"
     *        data-collection-template="new"
     *        data-collection-template-html="<li>...</li>">  <-- ВОТ ОН!
     *   </div>
     * </div>
     */
    // Ищем шаблон - он всегда прямой потомок контейнера коллекции
    let templateContainer = list.find('> [data-collection-template="new"]');
    if (!templateContainer.length) {
      return;
    }

    // Получаем HTML шаблона из атрибута data-collection-template-html
    let templateHtml = templateContainer.data('collection-template-html');
    if (!templateHtml) {
      return;
    }

    // Преобразуем HTML строку в jQuery объект (DOM элементы)
    let template = $(templateHtml);
    if (!template.length) {
      return;
    }

    /**
     * ШАГ 4: Проверяем ограничения (min/max элементов)
     */
    let items = list.find('> ul > [data-collection-item]');
    let maxItems = list.data('max');
    if (typeof maxItems !== 'undefined' && items.length >= maxItems) {
      return;
    }

    // Обновляем состояние кнопок ПОСЛЕ проверки, но ДО добавления
    this._updateActionsStateBasedOnMinMax(list);

    /**
     * ШАГ 5: Определяем, куда вставить новый элемент
     *
     * Есть два варианта:
     * 1. Кнопка внутри элемента списка (наша новая кнопка) - вставляем после этого элемента
     * 2. Кнопка в конце списка (оригинальная) - вставляем в начало или конец списка
     */
    // Используем уже найденный listItem из предыдущего блока
    let targetListItem = button.closest('li[data-collection-item]');
    let collectionHolder = list.find('> [data-collection-holder]');

    // Проверяем, нужно ли вставлять после элемента списка
    // Это работает только для кнопки "Добавить проект" внутри элемента проекта
    let isGalleryButton = button.attr('data-gallery-button') === 'true';
    if (targetListItem.length && position === 'top' && isGalleryButton) {
      // Кнопка "Добавить проект" внутри элемента - вставляем после этого элемента
      targetListItem.after(template);
    } else {
      // Обычная кнопка - вставляем в начало или конец списка
      let method = position === 'top' ? 'prepend' : 'append';
      collectionHolder[method](template);
    }

    /**
     * ШАГ 6: Обновляем индексы всех полей
     *
     * Когда добавляется новый элемент, нужно переиндексировать все поля формы:
     * - Имена полей (name="header[gallery][0][title]" → name="header[gallery][1][title]")
     * - ID элементов
     * - Атрибуты for у label
     */
    this.reindex(list);

    /**
     * ШАГ 7: Инициализируем вложенные коллекции
     *
     * Если в новом элементе есть вложенные списки (например, список фотографий),
     * нужно их тоже инициализировать
     */
    template.find('[data-type="collection"]').each((index, nestedList) => {
      this.addList($(nestedList));
    });

    /**
     * ШАГ 8: Инициализируем все поля формы
     *
     * Событие mutation._grav автоматически инициализирует:
     * - File upload поля (загрузка файлов)
     * - Toggle переключатели
     * - Select выпадающие списки
     * - И все остальные типы полей
     */
    $('body').trigger('mutation._grav', [template[0]]);

    // Также триггерим событие change для toggle полей
    template.find('[data-grav-field="toggleable"] input[type="checkbox"]').trigger('change');

    /**
     * ШАГ 8.5: Перемещаем кнопку "Добавить проект" в самый низ элемента проекта
     * после добавления элемента (проекта или фотографии)
     * Используем несколько попыток с разными задержками
     */
    let attempts = [100, 200, 300];
    attempts.forEach((delay) => {
      setTimeout(() => {
        // Перемещаем все кнопки "Добавить проект" вниз их элементов проекта
        this._fixAllGalleryButtons();
      }, delay);
    });

    items = list.closest('[data-type="collection"]').find('> ul > [data-collection-item]');
    let topAction = list.closest('[data-type="collection"]').find('[data-action-add="top"]');
    let sortAction = list.closest('[data-type="collection"]').find('[data-action="sort"]');

    if (items.length) {
      if (topAction.length) {
        topAction.parent().removeClass('hidden');
      }
      if (sortAction.length && items.length > 1) {
        sortAction.removeClass('hidden');
      }
    }

    // refresh toggleables in a list
    $('[data-grav-field="toggleable"] input[type="checkbox"]').trigger('change');

    this._updateActionsStateBasedOnMinMax(list);
  }

  static closeConfirmations() {
    $('.list-confirm-deletion[data-action="delete"]').addClass('hidden');
  }

  confirmRemove(event) {

    const button = $(event.currentTarget);
    const list = $(button.closest('.item-actions'));
    const action = list.find('.list-confirm-deletion[data-action="delete"]');
    const isHidden = action.hasClass('hidden');

    CollectionsField.closeConfirmations();
    action[isHidden ? 'removeClass' : 'addClass']('hidden');
  }

  removeItem(event) {
    let button = $(event.currentTarget);
    let item = button.closest('[data-collection-item]');
    let list = $(button.closest('[data-type="collection"]'));

    let items = list.closest('[data-type="collection"]').find('> ul > [data-collection-item]');
    let minItems = list.data('min');

    if (typeof minItems !== 'undefined' && items.length <= minItems) {
      return;
    }

    item.remove();
    this.reindex(list);

    items = list.closest('[data-type="collection"]').find('> ul > [data-collection-item]');
    let topAction = list.closest('[data-type="collection"]').find('[data-action-add="top"]');
    let sortAction = list.closest('[data-type="collection"]').find('[data-action="sort"]');

    if (!items.length) {
      if (topAction.length) {
        topAction.parent().addClass('hidden');
      }
    }

    if (sortAction.length && items.length <= 1) {
      sortAction.addClass('hidden');
    }
    this._updateActionsStateBasedOnMinMax(list);
  }

  collapseItems(event) {
    let button = $(event.currentTarget);
    let items = $(button.closest('[data-type="collection"]')).find('> ul > [data-collection-item] > .item-actions [data-action="collapse"]');

    items.click();
  }

  collapseItem(event) {
    let button = $(event.currentTarget);
    let item = button.closest('[data-collection-item]');

    button.attr('data-action', 'expand').removeClass('fa-chevron-circle-down').addClass('fa-chevron-circle-right');
    item.addClass('collection-collapsed');
  }

  expandItems(event) {
    let button = $(event.currentTarget);
    let items = $(button.closest('[data-type="collection"]')).find('> ul > [data-collection-item] > .item-actions [data-action="expand"]');

    items.click();
  }

  expandItem(event) {
    let button = $(event.currentTarget);
    let item = button.closest('[data-collection-item]');

    button.attr('data-action', 'collapse').removeClass('fa-chevron-circle-right').addClass('fa-chevron-circle-down');
    item.removeClass('collection-collapsed');
  }

  sortItems(event) {
    let button = $(event.currentTarget);
    let sortby = button.data('action-sort');
    let sortby_dir = button.data('action-sort-dir') || 'asc';
    let list = $(button.closest('[data-type="collection"]'));
    let items = list.closest('[data-type="collection"]').find('> ul > [data-collection-item]');

    items.sort((a, b) => {
      let A = $(a).find('[name$="[' + sortby + ']"]');
      let B = $(b).find('[name$="[' + sortby + ']"]');
      let sort;

      if (sortby_dir === 'asc') {
        sort = (A.val() < B.val())
               ? -1
               : (A.val() > B.val())
                 ? 1
                 : 0;
      } else {
        sort = (A.val() > B.val())
               ? -1
               : (A.val() < B.val())
                 ? 1
                 : 0;
      }

      return sort;
    }).each((_, container) => {
      $(container).parent().append(container);
    });

    this.reindex(list);
  }

  observeKey(event) {
    let input = $(event.target);
    let value = input.val();
    let item = input.closest('[data-collection-key]');

    item.data('collection-key-backup', item.data('collection-key')).data('collection-key', value);
    this.reindex(null, item);
  }

  reindex(list, items) {
    items = items || $(list).closest('[data-type="collection"]').find('> ul > [data-collection-item]');

    items.each((index, item) => {
      item = $(item);

      let observed = item.find('[data-key-observe]');
      let observedValue = observed.val();
      let hasCustomKey = observed.length;
      let currentKey = item.data('collection-key-backup');

      item.attr('data-collection-key', hasCustomKey
                                       ? observedValue
                                       : index);

      ['name', 'data-grav-field-name', 'for', 'id', 'data-grav-file-settings', 'data-file-post-add', 'data-file-post-remove', 'data-grav-array-name', 'data-grav-elements'].forEach((prop) => {
        item.find('[' + prop + '], [_' + prop + ']').each(function() {
          let element = $(this);
          let indexes = [];
          let array_index = null;
          let regexps = [
            new RegExp('\\[(\\d+|\\*|' + currentKey + ')\\]', 'g'),
            new RegExp('\\.(\\d+|\\*|' + currentKey + ')\\.', 'g')
          ];

          // special case to preserve array field index keys
          if (prop === 'name' && element.data('gravArrayType')) {
            const match_index = element.attr(prop).match(/\[[0-9]{1,}\]$/);
            const pattern = element[0].closest('[data-grav-array-name]').dataset.gravArrayName;
            if (match_index && pattern) {
              array_index = match_index[0];
              element.attr(prop, `${pattern}${match_index[0]}`);
              return;
            }
          }

          if (hasCustomKey && !observedValue) {
            element.attr(`_${prop}`, element.attr(prop));
            element.attr(prop, null);
            return;
          }

          if (element.attr(`_${prop}`)) {
            element.attr(prop, element.attr(`_${prop}`));
            element.attr(`_${prop}`, null);
          }

          element.parents('[data-collection-key]').map((idx, parent) => indexes.push($(parent).attr('data-collection-key')));
          indexes.reverse();

          let matchedKey = currentKey;
          let replaced = element.attr(prop).replace(regexps[0], (/* str, p1, offset */) => {
            let extras = '';
            if (array_index) {
              extras = array_index;
            }

            matchedKey = indexes.shift() || matchedKey;
            return `[${matchedKey}]${extras}`;
          });

          replaced = replaced.replace(regexps[1], (/* str, p1, offset */) => {
            matchedKey = indexes.shift() || matchedKey;
            return `.${matchedKey}.`;
          });

          element.attr(prop, replaced);
        });
      });
    });
  }

  _onAddedNodes(event, target/* , record, instance */) {
    let collections = $(target).find('[data-type="collection"]');
    if (!collections.length) {
      return;
    }

    collections.each((index, collection) => {
      collection = $(collection);
      if (!~this.lists.index(collection)) {
        this.addList(collection);
      }
    });

    // Перемещаем кнопку "Добавить проект" в самый низ элемента проекта
    // после добавления элементов во вложенные списки (например, фотографий)
    // Используем несколько попыток с разными задержками, чтобы гарантировать перемещение
    let attempts = [50, 150, 250, 350];
    attempts.forEach((delay) => {
      setTimeout(() => {
        // Просто перемещаем все кнопки "Добавить проект" вниз их элементов проекта
        // Это более надежный способ, чем пытаться найти конкретный элемент
        this._fixAllGalleryButtons();
      }, delay);
    });
  }

  /**
   * Перемещает кнопку "Добавить проект" в самый низ элемента проекта
   * Эта функция вызывается после добавления фотографий во вложенный список
   * Кнопка должна быть всегда последним элементом внутри <li data-collection-item>
   */
  _moveGalleryButtonToBottom(item) {
    let projectItem = $(item);
    if (!projectItem.is('li[data-collection-item]')) {
      projectItem = projectItem.closest('li[data-collection-item]');
    }

    if (!projectItem.length) {
      return;
    }

    // Находим кнопку "Добавить проект" внутри элемента проекта
    let galleryButton = projectItem.find('.collection-actions [data-gallery-button="true"]');
    if (!galleryButton.length) {
      return;
    }

    let buttonContainer = galleryButton.closest('.collection-actions');
    if (!buttonContainer.length) {
      return;
    }

    // Получаем все прямые потомки элемента проекта
    let children = projectItem.children();
    let lastChild = children.last();

    // Проверяем, не находится ли кнопка уже в самом низу
    if (lastChild.is(buttonContainer)) {
      // Кнопка уже внизу, ничего не делаем
      return;
    }

    // Перемещаем кнопку в самый низ элемента проекта (перед закрывающим тегом </li>)
    // Используем detach и append, чтобы сохранить все обработчики событий
    let buttonHtml = buttonContainer.detach();
    projectItem.append(buttonHtml);
  }

  /**
   * Находит все элементы проекта и перемещает кнопки "Добавить проект" вниз
   * Вызывается после каждого добавления элемента
   */
  _fixAllGalleryButtons() {
    // Находим все элементы проекта (имеют кнопку "Добавить проект")
    $('li[data-collection-item]').each((index, el) => {
      let projectItem = $(el);
      let hasGalleryButton = projectItem.find('.collection-actions [data-gallery-button="true"]').length > 0;
      if (hasGalleryButton) {
        // Перемещаем кнопку в самый низ элемента проекта
        this._moveGalleryButtonToBottom(projectItem);
      }
    });
  }

  /**
   * Инициализирует постоянное отслеживание позиции кнопок "Добавить проект"
   * Использует MutationObserver для отслеживания изменений DOM
   */
  _initGalleryButtonWatcher() {
    // Создаем MutationObserver для отслеживания изменений в DOM
    if (typeof MutationObserver !== 'undefined') {
      let observer = new MutationObserver((mutations) => {
        // Проверяем, были ли добавлены или удалены элементы
        let hasChanges = false;
        mutations.forEach((mutation) => {
          if (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0) {
            hasChanges = true;
          }
        });

        if (hasChanges) {
          // При любом изменении DOM перемещаем все кнопки "Добавить проект" вниз
          // Используем несколько попыток с разными задержками
          [50, 150, 250].forEach((delay) => {
            setTimeout(() => {
              this._fixAllGalleryButtons();
            }, delay);
          });
        }
      });

      // Наблюдаем за изменениями во всех контейнерах списков
      $('[data-type="collection"]').each((index, container) => {
        observer.observe(container, {
          childList: true,
          subtree: true
        });
      });
    }

    // Также используем периодическую проверку как резервный механизм
    // Проверяем каждые 500ms и перемещаем кнопки, если нужно
    setInterval(() => {
      this._fixAllGalleryButtons();
    }, 500);
  }

  _updateActionsStateBasedOnMinMax(list) {
    let items = list.closest('[data-type="collection"]').find('> ul > [data-collection-item]');
    let minItems = list.data('min');
    let maxItems = list.data('max');

    list.find('> .collection-actions [data-action="add"]').attr('disabled', false);
    list.find('> ul > li > .item-actions [data-action="delete"]').attr('disabled', false);

    if (typeof minItems !== 'undefined' && items.length <= minItems) {
      list.find('> ul > li > .item-actions [data-action="delete"]').attr('disabled', true);
    }

    if (typeof maxItems !== 'undefined' && items.length >= maxItems) {
      list.find('> .collection-actions [data-action="add"]').attr('disabled', true);
    }
  }
}

export let Instance = new CollectionsField();
