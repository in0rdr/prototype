FROM ruby:rc-alpine

RUN apk add --update --no-cache --virtual .ruby-builddeps build-base ruby-dev libxml2-dev libxslt-dev nodejs tzdata git perl
#RUN apk del .ruby-builddeps

#install nokigiri with system libraries (libxml2, libxslt)
RUN bundle config build.nokigiri --use-system-libraries

RUN mkdir /api
WORKDIR /api
COPY startrails.sh /api
COPY railsapp /api
RUN bundle install

EXPOSE 30000

RUN chmod +x startrails.sh
CMD ["./startrails.sh"]
