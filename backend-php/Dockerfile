FROM php:8.2-apache

ENV APACHE_DOCUMENT_ROOT=/var/www/html
ENV UPLOAD_DIR=/var/www/html/uploads/cv

RUN docker-php-ext-install pdo_mysql \
  && a2enmod rewrite headers

COPY apache.conf /etc/apache2/sites-available/000-default.conf
COPY . /var/www/html

RUN mkdir -p "${UPLOAD_DIR}" \
  && chown -R www-data:www-data /var/www/html

EXPOSE 80
