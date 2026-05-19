FROM php:8.3-apache

RUN docker-php-ext-install pdo_mysql
RUN a2enmod rewrite headers

COPY apache.conf /etc/apache2/sites-available/000-default.conf
COPY . /var/www/html/

RUN mkdir -p /var/www/html/uploads/cv \
  && chown -R www-data:www-data /var/www/html/uploads

EXPOSE 80
