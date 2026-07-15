# Troubleshooting

## Man hinh quan ly tra ve 404 khi chay local

Next.js 16 dung Turbopack mac dinh va luu cache dev tren dia. Cache cu co the khong
con khop sau khi merge, pull hoac dung dev server dot ngot.

Dung cac npm scripts cua project:

```bash
npm run clean
npm run dev
```

Tren Windows co the chay tuong duong:

```powershell
npm.cmd run clean
npm.cmd run dev
```

Khong chay `next dev` truc tiep. Lenh do bo qua `scripts/dev.mjs`, dung Turbopack
va cache `.next` mac dinh. `npm run dev` se don cache xung dot, dung cache dev
rieng `.next-dev` va khoi dong Next.js bang Webpack.

Neu port 3000 dang duoc su dung, dung dev server cu truoc khi chay lai lenh tren.
