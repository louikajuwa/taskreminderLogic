<?php

return [
    /*
    | Maximum size per uploaded attachment, in kilobytes. Defaults to 10 MB.
    | Keep this in sync with upload_max_filesize / post_max_size in docker/php/php.ini.
    */
    'max_kb' => (int) env('ATTACHMENT_MAX_KB', 10240),

    /*
    | Allowed file extensions for attachments.
    */
    'mimes' => 'jpg,jpeg,png,gif,webp,pdf,doc,docx,xls,xlsx,ppt,pptx,txt,csv,zip',
];
