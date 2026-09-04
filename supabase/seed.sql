-- Seed locations (carried over from the old app's static region/country/city data)
insert into public.locations (city, country, region) values
  ('Tokyo', 'Japan', 'Asia'),
  ('Kyoto', 'Japan', 'Asia'),
  ('Shanghai', 'China', 'Asia'),
  ('Beijing', 'China', 'Asia'),
  ('Ho Chi Minh City', 'Vietnam', 'Asia'),
  ('Hue', 'Vietnam', 'Asia'),
  ('London', 'UK', 'Europe')
on conflict (city, country) do nothing;
