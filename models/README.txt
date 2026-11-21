THƯ MỤC MODELS (.GLB) CHO SHIPPER SÀI GÒN VOXEL 3D
==================================================

Chỉ cần đưa các ảnh đã cắt sẵn trong thư mục `images_to_glb/` lên Tripo3D hoặc Meshy,
xuất file `.glb` (chọn 5.000 - 10.000 faces, Texture 1024px), đổi đúng tên dưới đây
và chép vào thư mục `models/` này — game sẽ tự động nạp, tự căn kích thước và chạm đất!

1. 5 Loại Xe Người Chơi:
   - veh_0.glb  (từ 01_xe_dap_tho.jpg)
   - veh_1.glb  (từ 02_honda_wave.jpg)
   - veh_2.glb  (từ 03_honda_vision.jpg)
   - veh_3.glb  (từ 04_xe_ba_gac.jpg)
   - veh_4.glb  (từ 05_xe_tai_mini.jpg)

2. 5 Nhân Vật Tài Xế:
   - char_0.glb (từ 06_nv_tan_binh.jpg)
   - char_1.glb (từ 07_nv_tra_sua.jpg)
   - char_2.glb (từ 08_nv_chu_ba.jpg)
   - char_3.glb (từ 09_nv_sinh_vien.jpg)
   - char_4.glb (từ 10_nv_vua_pho.jpg)

3. 4 Xe Giao Thông Phố Sài Gòn:
   - npc_bike.glb (từ 11_xe_may_npc.jpg)
   - bus.glb      (từ 12_saigon_bus.jpg)
   - truck.glb    (từ 13_xe_tai_thung.jpg)
   - cont.glb     (từ 14_xe_container.jpg)

4. 3 Nhà Phố Sài Gòn:
   - house_0.glb  (từ 15_nha_co_vang.jpg)
   - house_1.glb  (từ 16_tiem_tap_hoa.jpg)
   - house_2.glb  (từ 17_quan_ca_phe.jpg)

Mẹo: File nào bạn chưa tạo `.glb`, game sẽ tự giữ khối Voxel dự phòng nên bạn có thể
thay từng món một (ví dụ thay xe Wave và xe buýt trước) rồi test ngay!
Nếu model bị quay ngược hướng, chỉnh giá trị `rotY` trong `js/modelLoader.js` (0 hoặc Math.PI).
