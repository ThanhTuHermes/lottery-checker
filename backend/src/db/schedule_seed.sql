-- Seed lottery schedule (41 provinces)
-- day_of_week: 0=Chủ nhật, 1=Thứ 2, 2=Thứ 3, 3=Thứ 4, 4=Thứ 5, 5=Thứ 6, 6=Thứ 7
-- draw_time: 16:15=MN, 17:15=MT, 18:15=MB

-- Miền Bắc
INSERT INTO lottery_schedule (region, province_code, province_name, day_of_week, draw_time, frequency_per_week) VALUES
('north', 'HANOI', 'Hà Nội', 1, '18:15:00', 2),
('north', 'HANOI', 'Hà Nội', 4, '18:15:00', 2),
('north', 'QUANG_NINH', 'Quảng Ninh', 2, '18:15:00', 1),
('north', 'BAC_NINH', 'Bắc Ninh', 3, '18:15:00', 1),
('north', 'HAI_PHONG', 'Hải Phòng', 5, '18:15:00', 1),
('north', 'NAM_DINH', 'Nam Định', 6, '18:15:00', 1),
('north', 'THAI_BINH', 'Thái Bình', 0, '18:15:00', 1);

-- Miền Trung
INSERT INTO lottery_schedule (region, province_code, province_name, day_of_week, draw_time, frequency_per_week) VALUES
('central', 'HUE', 'Thừa Thiên Huế', 1, '17:15:00', 1),
('central', 'PHU_YEN', 'Phú Yên', 1, '17:15:00', 1),
('central', 'DAK_LAK', 'Đắk Lắk', 2, '17:15:00', 1),
('central', 'QUANG_NAM', 'Quảng Nam', 2, '17:15:00', 1),
('central', 'DA_NANG', 'Đà Nẵng', 3, '17:15:00', 2),
('central', 'DA_NANG', 'Đà Nẵng', 6, '17:15:00', 2),
('central', 'KHANH_HOA', 'Khánh Hòa', 3, '17:15:00', 2),
('central', 'KHANH_HOA', 'Khánh Hòa', 0, '17:15:00', 2),
('central', 'BINH_DINH', 'Bình Định', 4, '17:15:00', 1),
('central', 'QUANG_BINH', 'Quảng Bình', 4, '17:15:00', 1),
('central', 'QUANG_TRI', 'Quảng Trị', 4, '17:15:00', 1),
('central', 'GIA_LAI', 'Gia Lai', 5, '17:15:00', 1),
('central', 'NINH_THUAN', 'Ninh Thuận', 5, '17:15:00', 1),
('central', 'DAK_NONG', 'Đắk Nông', 6, '17:15:00', 1),
('central', 'QUANG_NGAI', 'Quảng Ngãi', 6, '17:15:00', 1),
('central', 'KON_TUM', 'Kon Tum', 0, '17:15:00', 1);

-- Miền Nam
INSERT INTO lottery_schedule (region, province_code, province_name, day_of_week, draw_time, frequency_per_week) VALUES
('south', 'CA_MAU', 'Cà Mau', 1, '16:15:00', 1),
('south', 'DONG_THAP', 'Đồng Tháp', 1, '16:15:00', 1),
('south', 'HO_CHI_MINH', 'TP. Hồ Chí Minh', 1, '16:15:00', 2),
('south', 'HO_CHI_MINH', 'TP. Hồ Chí Minh', 6, '16:15:00', 2),
('south', 'BAC_LIEU', 'Bạc Liêu', 2, '16:15:00', 1),
('south', 'BEN_TRE', 'Bến Tre', 2, '16:15:00', 1),
('south', 'VUNG_TAU', 'Vũng Tàu', 2, '16:15:00', 1),
('south', 'CAN_THO', 'Cần Thơ', 3, '16:15:00', 1),
('south', 'DONG_NAI', 'Đồng Nai', 3, '16:15:00', 1),
('south', 'SOC_TRANG', 'Sóc Trăng', 3, '16:15:00', 1),
('south', 'AN_GIANG', 'An Giang', 4, '16:15:00', 1),
('south', 'BINH_THUAN', 'Bình Thuận', 4, '16:15:00', 1),
('south', 'TAY_NINH', 'Tây Ninh', 4, '16:15:00', 1),
('south', 'BINH_DUONG', 'Bình Dương', 5, '16:15:00', 1),
('south', 'TRA_VINH', 'Trà Vinh', 5, '16:15:00', 1),
('south', 'VINH_LONG', 'Vĩnh Long', 5, '16:15:00', 1),
('south', 'BINH_PHUOC', 'Bình Phước', 6, '16:15:00', 1),
('south', 'HAU_GIANG', 'Hậu Giang', 6, '16:15:00', 1),
('south', 'LONG_AN', 'Long An', 6, '16:15:00', 1),
('south', 'KIEN_GIANG', 'Kiên Giang', 0, '16:15:00', 1),
('south', 'LAM_DONG', 'Lâm Đồng', 0, '16:15:00', 1),
('south', 'TIEN_GIANG', 'Tiền Giang', 0, '16:15:00', 1);