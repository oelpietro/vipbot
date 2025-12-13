// botvip.js — Telegram BOT + PIX PushinPay (API oficial)
// ======================================================

require("dotenv").config();
const { Telegraf, Markup } = require("telegraf");
const fetch = require("node-fetch");

const bot = new Telegraf(process.env.BOT_TOKEN);
const API_KEY = process.env.PUSHIN_API_KEY;

// ======================================================
// MAPAS PARA GUARDAR INFORMAÇÕES IMPORTANTES
// ======================================================
const planoEscolhido = new Map();      // plano escolhido pelo userId -> 'semanal'|'quinzenal'|'mensal'
const pagamentoPendente = new Map();   // userId -> pixId (transaction id)
const descontoEnviado = new Map();     // userId -> true/false (se já recebeu promoção)
const upsellPendente = new Map();      // userId -> pixId para upsell (R$24,99)

// ======================================================
// LINKS POR PLANO (links de acesso após pagamento do plano)
// ======================================================
const LINKS = {
    semanal: "https://t.me/+q750M8gGzVY3Yzdh",
    quinzenal: "https://t.me/+F43o2kKmuC83OTBh",
    mensal: "https://t.me/+txTJL8250dhmNzgx",
    upsell: "https://t.me/+-ZL2Ev8-64BiYTM5"
};

// ======================================================
// FUNÇÃO — CRIAR PIX (PushinPay / endpoint oficial)
// Retorna o JSON da API ou null
// ======================================================
async function gerarPix(valorCentavos) {
    try {
        const resp = await fetch("https://api.pushinpay.com.br/api/pix/cashIn", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                value: valorCentavos,
                webhook_url: null,
                split_rules: []
            })
        });

        const json = await resp.json();
        if (!resp.ok) {
            console.log("Erro ao gerar PIX:", json);
            return null;
        }
        return json;
    } catch (err) {
        console.log("Erro ao gerar PIX:", err);
        return null;
    }
}

// ======================================================
// FUNÇÃO — VERIFICAR STATUS DO PAGAMENTO (PLANOS NORMAIS)
// Checa a cada 60s (recomendado pela PushinPay)
// ======================================================
async function verificarPagamento(ctx, idPagamento) {
    const userId = ctx.from.id;

    const intervalo = setInterval(async () => {
        try {
            const resp = await fetch(`https://api.pushinpay.com.br/api/transactions/${idPagamento}`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${API_KEY}`,
                    "Accept": "application/json"
                }
            });

            if (resp.status === 404) {
                // não encontrado, espera próxima checagem
                return;
            }

            const json = await resp.json();

            if (json.status && json.status.toLowerCase() === "paid") {
                clearInterval(intervalo);

                // limpar pendências
                pagamentoPendente.delete(userId);
                descontoEnviado.delete(userId);

                const plano = planoEscolhido.get(userId);
                const linkVip = LINKS[plano] || LINKS.mensal;

                await ctx.reply(
                    `✅ *Pagamento confirmado!*\n\n` +
                    `🎉 Seu acesso ao VIP foi liberado!\n\n` +
                    `👉 *Acesse aqui:* ${linkVip}`,
                    { parse_mode: "Markdown" }
                );

                // oferecer upsell
                await enviarUpsell(ctx);
            }

        } catch (err) {
            console.log("Erro ao consultar transação:", err);
            // não interrompe; aguarda próxima checagem
        }
    }, 60 * 1000); // 60 segundos entre consultas (respeitar PushinPay)
}

// ======================================================
// FUNÇÃO — VERIFICAR PAGAMENTO DO UPSELL (R$24,99)
// ======================================================
async function verificarUpsell(ctx, idPagamento) {
    const userId = ctx.from.id;

    const intervalo = setInterval(async () => {
        try {
            const resp = await fetch(`https://api.pushinpay.com.br/api/transactions/${idPagamento}`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${API_KEY}`,
                    "Accept": "application/json"
                }
            });

            if (resp.status === 404) return;

            const json = await resp.json();

            if (json.status && json.status.toLowerCase() === "paid") {
                clearInterval(intervalo);

                upsellPendente.delete(userId);

                await ctx.reply(
                    `🔥 *UPGRADE ATIVADO!*\n\n` +
                    `Você agora tem acesso ao nosso VIP *EXCLUSIVO*!\n\n` +
                    `👉 *Acesse agora:* ${LINKS.upsell}`,
                    { parse_mode: "Markdown" }
                );
            }

        } catch (err) {
            console.log("Erro ao consultar transação do upsell:", err);
        }
    }, 60 * 1000);
}

// ======================================================
// COOLDOWN DE 1 MINUTO POR USUÁRIO (anti-spam)
// ======================================================
const cooldown = new Map();

// ======================================================
// MENU PRINCIPAL (vídeo + texto + botões)
// ======================================================
bot.start(async (ctx) => {
    try {
        await ctx.replyWithVideo(
            { source: "videos/VID_20250214_022904_253.mp4" },
            { caption: "🎥 *Confira no vídeo acima o que nosso VIP oferece!*🌟\n\n✅ São mais de 20 categorias exclusivas, organizadas para você ter tudo de forma prática e acessível.\n\n🔥 Aproveite o melhor conteúdo em um único lugar!\n\nO GRUPO MAIS COMPLETO E ORGANIZADO DO TELEGRAM!", parse_mode: "Markdown" }
        );
    } catch (err) {
        await ctx.reply("⚠️ Não consegui enviar o vídeo, mas vamos continuar!");
    }

    await ctx.reply(
        `📂 NOVINHAS +18
📂 LIVES VAZADINHAS
📂 INCESTOS & FLAGRAS +18
📂 VAZADINHAS
📂 AMADORAS
📁 FLAGRAS
📂 TOTALMENTE LIBERADO💯
📁 + 16 CATEGORIAS

🔐 PAGAMENTO SEGURO 
📌 SIGILO TOTAL
❌ VAGAS LIMITADAS

👇 *Selecione um plano para gerar o PIX:*`,
        {
            parse_mode: "Markdown",
            ...Markup.inlineKeyboard([
                [Markup.button.callback("🔥 R$ 8,90 — Semanal", "plano_790")],
                [Markup.button.callback("🔥 R$ 11,90 — Quinzenal", "plano_1490")],
                [Markup.button.callback("🔥 R$ 14,90 — Mensal", "plano_2990")],
                 [Markup.button.url("📞 Suporte", "https://t.me/romanogs")]
            ])
        }
    );
});

// ======================================================
// PLANOS — setar planoEscolhido e gerar PIX
// ======================================================
bot.action("plano_790", (ctx) => {
    planoEscolhido.set(ctx.from.id, "semanal");
    pagar(ctx, 890, "Plano Semanal");
});

bot.action("plano_1490", (ctx) => {
    planoEscolhido.set(ctx.from.id, "quinzenal");
    pagar(ctx, 1190, "Plano Quinzenal");
});

bot.action("plano_2990", (ctx) => {
    planoEscolhido.set(ctx.from.id, "mensal");
    pagar(ctx, 1490, "Plano Mensal");
});

// ======================================================
// FUNÇÃO PAGAR — gera PIX, inicia verificação e seta timeout p/ promoção
// ======================================================
async function pagar(ctx, valorCentavos, nomePlano) {
    const userId = ctx.from.id;
    const agora = Date.now();

    if (cooldown.has(userId)) {
        const ultimo = cooldown.get(userId);
        const diff = Math.floor((agora - ultimo) / 1000);
        if (diff < 60) {
            const restante = 60 - diff;
            return ctx.reply(`⏳ *Aguarde ${restante}s para gerar outro PIX.*`, { parse_mode: "Markdown" });
        }
    }

    cooldown.set(userId, agora);

    await ctx.answerCbQuery().catch(()=>{});
    await ctx.reply(`⌛ *Gerando PIX do ${nomePlano}...*`, { parse_mode: "Markdown" });

    const pix = await gerarPix(valorCentavos);
    if (!pix) return ctx.reply("❌ Erro ao gerar PIX.");

    // salvar pendência
    pagamentoPendente.set(userId, pix.id);

    // enviar QR + copia e cola
    try {
        const base64data = pix.qr_code_base64.split(",")[1];
        const imgBuffer = Buffer.from(base64data, "base64");

        await ctx.replyWithPhoto(
            { source: imgBuffer },
            {
                caption:
                    `💳 *PIX Gerado!*\n\n` +
                    `📌 *${nomePlano}*\n` +
                    `💰 Valor: *R$ ${(valorCentavos / 100).toFixed(2)}*\n\n` +
                    `🔽 *PIX Copia e Cola:*\n\`${pix.qr_code}\``,
                parse_mode: "Markdown"
            }
        );
    } catch (err) {
        // caso não tenha qr_code_base64, tenta enviar apenas o copia/cola
        await ctx.reply(`🔽 *PIX Copia e Cola:*\n\`${pix.qr_code}\``, { parse_mode: "Markdown" });
    }

    // iniciar verificação do pagamento (a cada 60s)
    verificarPagamento(ctx, pix.id);

    // === timeout de 10 minutos: enviar promoção 50% OFF se ainda pendente ===
    setTimeout(async () => {
        try {
            const idPend = pagamentoPendente.get(userId);
            const jaEnviado = descontoEnviado.get(userId);
            if (!idPend) return; // já pagou
            if (jaEnviado) return; // já enviou promoção

            descontoEnviado.set(userId, true);

            // mostrar botões de desconto por plano (os valores são metade dos originais)
            const valoresOriginais = { semanal: 890, quinzenal: 1190, mensal: 1490 };
            const planoAtual = planoEscolhido.get(userId) || 'semanal';
            const novoValor = (valoresOriginais[planoAtual] / 2 / 100).toFixed(2);

            await ctx.reply(
                `🔥 *OFERTA EXCLUSIVA!*\n\nPercebemos que você gerou o PIX mas *ainda não concluiu o pagamento*.\n\n💥 *50% DE DESCONTO POR TEMPO LIMITADO!*`,
                {
                    parse_mode: "Markdown",
                    ...Markup.inlineKeyboard([
                        [ Markup.button.callback(`💸 R$ ${(valoresOriginais.semanal/2/100).toFixed(2)} — Semanal`, "desconto_semanal") ],
                        [ Markup.button.callback(`💸 R$ ${(valoresOriginais.quinzenal/2/100).toFixed(2)} — Quinzenal`, "desconto_quinzenal") ],
                        [ Markup.button.callback(`💸 R$ ${(valoresOriginais.mensal/2/100).toFixed(2)} — Vitalício`, "desconto_mensal") ]
                    ])
                }
            );
        } catch (err) {
            console.log("Erro ao enviar promoção automática:", err);
        }
    }, 10 * 60 * 1000); // 10 minutos
}

// ======================================================
// HANDLERS GERAÇÃO DE PIX COM DESCONTO (botões individuais)
// ======================================================
bot.action("desconto_semanal", async (ctx) => {
    await ctx.answerCbQuery().catch(()=>{});
    await gerarDesconto(ctx, "semanal", 890);
});

bot.action("desconto_quinzenal", async (ctx) => {
    await ctx.answerCbQuery().catch(()=>{});
    await gerarDesconto(ctx, "quinzenal", 1190);
});

bot.action("desconto_mensal", async (ctx) => {
    await ctx.answerCbQuery().catch(()=>{});
    await gerarDesconto(ctx, "mensal", 1490);
});

async function gerarDesconto(ctx, plano, valorOriginalCentavos) {
    const userId = ctx.from.id;
    await ctx.reply(`🔥 Gerando PIX com 50% OFF (${plano})...`);

    const novoValor = Math.floor(valorOriginalCentavos / 2); // centavos
    const pix = await gerarPix(novoValor);
    if (!pix) return ctx.reply("❌ Erro ao gerar PIX com desconto.");

    // salvar pendência trocando a anterior
    pagamentoPendente.set(userId, pix.id);
    planoEscolhido.set(userId, plano);

    // enviar QR / copia e cola
    try {
        const base64data = pix.qr_code_base64.split(",")[1];
        const imgBuffer = Buffer.from(base64data, "base64");
        await ctx.replyWithPhoto({ source: imgBuffer }, {
            caption: `💸 *PIX com 50% OFF Gerado!*\n\n📌 Plano: *${plano}*\n💰 Valor: *R$ ${(novoValor/100).toFixed(2)}*\n\n🔽 *PIX Copia e Cola:*\n\`${pix.qr_code}\``,
            parse_mode: "Markdown"
        });
    } catch (err) {
        await ctx.reply(`🔽 *PIX Copia e Cola:*\n\`${pix.qr_code}\``, { parse_mode: "Markdown" });
    }

    // iniciar verificação (cada 60s)
    verificarPagamento(ctx, pix.id);
}

// ======================================================
// UPSELL: enviar oferta R$24,99 após confirmação do plano
// ======================================================
async function enviarUpsell(ctx) {
    try {
        // envia imagem + botão
        await ctx.replyWithPhoto(
            { source: "fotos/big_8c56a2dcfc0cfe02efa7f42f413bdf63.png" },
            {
                caption:
                    `🔥 *OFERTA ESPECIAL!*\n\n` +
                    `Nós temos uma oferta especial para você! 🎁

VIP PROIBIDÃO

✅ São mais de 20 categorias exclusivas, organizadas para você ter tudo de forma prática e acessível.

👅- Lives   👙- Novinhas
😏- Vazadas 🐂- Adolecentes
💋- Flagras  🤤- Amadores
💻- Caiu na net  👩‍👦- Mãe e filho
👫 - Irmãos       👫- Pai e filha

🔥 Atualizacoes Diarias: Receba 500 novos conteudos todos os dias, direto no grupo!

📂 Mais de 10.000 mídias já adicionadas: Um acervo enorme disponível desde o primeiro acesso!\n\n` +
                    `Deseja liberar agora? 👇`,
                parse_mode: "Markdown",
                ...Markup.inlineKeyboard([
                    [ Markup.button.callback("⭐ Liberar por R$ 24,99", "upsell_2499") ]
                ])
            }
        );
    } catch (err) {
        console.log("Erro ao enviar upsell:", err);
    }
}

// ======================================================
// BOTÃO DO UPSELL (gera PIX de R$24,99 e verifica)
// ======================================================
bot.action("upsell_2499", async (ctx) => {
    await ctx.answerCbQuery().catch(()=>{});
    await ctx.reply("🔒 Gerando PIX do VIP Premium (R$ 24,99)...");

    const valorCentavos = 2499;
    const pix = await gerarPix(valorCentavos);
    if (!pix) return ctx.reply("❌ Erro ao gerar PIX do VIP Premium.");

    upsellPendente.set(ctx.from.id, pix.id);

    try {
        const base64data = pix.qr_code_base64.split(",")[1];
        const imgBuffer = Buffer.from(base64data, "base64");
        await ctx.replyWithPhoto({ source: imgBuffer }, {
            caption: `✨ *PIX do VIP EXCLUSIVO (R$ 24,99)*\n\n🔽 Copie e cole:\n\`${pix.qr_code}\``,
            parse_mode: "Markdown"
        });
    } catch (err) {
        await ctx.reply(`🔽 *PIX Copia e Cola:*\n\`${pix.qr_code}\``, { parse_mode: "Markdown" });
    }

    verificarUpsell(ctx, pix.id);
});

// ======================================================
// INICIAR BOT
// ======================================================
bot.launch();
console.log("🤖 Bot VIP rodando normalmente…");
