---
title: 'Отправить заявку'
menu: Отправить заявку
visible: true
template: form
form:
    name: inquiry_form
    fields:
        -
            name: name
            label: 'Ваше имя'
            placeholder: 'Введите ваше имя'
            type: text
            validate:
                required: true
        -
            name: company
            label: Компания
            placeholder: 'Название компании'
            type: text
        -
            name: phone
            label: Телефон
            placeholder: '+7 (xxx) xxx-xx-xx'
            type: tel
            validate:
                required: true
        -
            name: email
            label: Email
            placeholder: your@email.com
            type: email
            validate:
                required: true
        -
            name: service
            type: select
            size: long
            label: Услуга
            help: 'Выберите тип услуги, который вас интересует. Это поможет нам подготовить персонализированное предложение'
            options:
                '': 'Выберите услугу'
                development: 'Разработка и строительство выставочных стендов'
                design: 'Дизайн выставочных стендов'
                full_service: 'Полный выставочный сервис'
            validate:
                required: true
        -
            name: budget
            label: 'Бюджет проекта'
            placeholder: 'Укажите бюджет в рублях'
            type: text
            validate:
                required: true
        -
            name: message
            label: 'Описание проекта'
            placeholder: 'Расскажите о вашем проекте, требованиях и пожеланиях'
            type: textarea
            validate:
                required: true
        -
            name: files
            label: 'Прикрепить файлы'
            type: file
            multiple: true
            limit: 10
            filesize: 32
            destination: 'user-data://forms/uploads'
            avoid_overwriting: true
            random_name: false
            accept:
                - .pdf
                - .doc
                - .docx
                - .xls
                - .xlsx
                - .ppt
                - .pptx
                - .jpg
                - .jpeg
                - .png
                - .gif
                - .bmp
                - .tiff
                - .zip
                - .rar
                - .txt
            help: 'Можно загрузить до 10 файлов. Поддерживаемые форматы: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, изображения (JPG, PNG, GIF, BMP, TIFF), архивы (ZIP, RAR), текстовые файлы (TXT). Максимальный размер файла: 32MB.'
        -
            name: agreement
            label: 'Согласие на обработку персональных данных'
            type: checkbox
            validate:
                required: true
    buttons:
        -
            type: submit
            value: 'Отправить заявку'
            classes: 'btn btn-primary custom-form-btn'
        -
            type: reset
            value: Очистить
            classes: 'btn btn-secondary custom-form-btn'
    process:
        -
            email:
                from: '{{ config.plugins.email.from }}'
                to:
                    - 'expoland@mail.ru'
                    - 'stand@expoland-group.ru'
                reply_to: '{{ form.value.email }}'
                subject: '[Заявка] Новая заявка с сайта'
                body: '{% include "forms/inquiry.html.twig" %}'
                attachments:
                    - 'files'
                process_markdown: false
                content_type: text/html
        -
            save:
                fileprefix: inquiry-
                dateformat: Ymd-His-u
                extension: txt
                body: '{% include "forms/data.txt.twig" %}'
                destination: 'user-data://forms/submissions'
        -
            message: 'Спасибо за заявку! Мы свяжемся с вами в ближайшее время.'
        -
            display: thankyou
---

# Отправить заявку

