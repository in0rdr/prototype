FROM ruby:latest

RUN mkdir /api
WORKDIR /api
COPY startrails.sh /api
COPY railsapp /api
RUN bundle install

EXPOSE 30000

RUN chmod +x startrails.sh
CMD ["./startrails.sh"]
