<?php
// Vzor nastavení newsletteru. Zkopíruj jako api/config.php (je v .gitignore) nebo raději MIMO veřejnou
// složku webu jako ../mkb-config.php (o úroveň výš než kořen webu). Skutečné hodnoty nikdy necommituj.
//
// Hash hesla vytvoříš příkazem:
//   php -r 'echo password_hash("tvoje-dlouhe-heslo", PASSWORD_DEFAULT), PHP_EOL;'
return [
    // Hash hesla pro správu newsletteru (spravce.html → Newsletter). Prázdné = přihlášení vypnuté.
    'admin_password_hash' => '',

    // Kam chodí „Poslat test na můj e-mail“. Test jde vždy jen sem, ne na libovolnou adresu.
    'test_email' => 'info@marcuskoky.cz',

    // Veřejná adresa webu s lomítkem na konci. Odkazy v e-mailech se skládají z ní, nikdy z hlavičky Host.
    'site_url' => 'https://www.marcuskoky.cz/',

    // Složka pro databázi SQLite. Nejlépe mimo kořen webu; jinak api/data (chráněná .htaccess).
    'data_dir' => __DIR__ . '/data',

    // Kolik e-mailů se pošle v jedné dávce (jeden požadavek ze správce). Hlídej limity hostingu.
    'batch_size' => 25,
];
